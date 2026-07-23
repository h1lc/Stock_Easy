const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { authenticate } = require('../middleware/auth');
const { sendResetPasswordEmail } = require('../services/email');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'stockeasy-api' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('Email Google non disponible'));

      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId: profile.id }, { email }] },
      });

      if (user) {
        // Lier le compte Google si pas encore fait
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id },
          });
        }
      } else {
        // Créer un nouveau compte
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            role: 'COMMERCIAL',
          },
        });
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  }));

  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google` }),
    async (req, res) => {
      const user = req.user;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      setRefreshCookie(res, refreshToken);

      // Rediriger vers le frontend avec l'access token en query param (stocké dans localStorage par le frontend)
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const userStr = encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }));
      res.redirect(`${clientUrl}/auth/callback?token=${accessToken}&user=${userStr}`);
    }
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Mot de passe : au moins une majuscule')
    .matches(/[0-9]/).withMessage('Mot de passe : au moins un chiffre'),
  body('name').trim().notEmpty().withMessage('Le nom est requis').isLength({ max: 100 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: 'COMMERCIAL' },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    const dummyHash = '$2a$10$dummyhashfortimingprotection.dummy';
    const passwordHash = user?.password || dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid || !user.active) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (user.googleId && !user.password) {
      return res.status(401).json({ error: 'Ce compte utilise la connexion Google' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    setRefreshCookie(res, refreshToken);

    res.json({
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token manquant' });

  try {
    const user = await prisma.user.findFirst({ where: { refreshToken: token } });
    if (!user || !user.active) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });
    setRefreshCookie(res, newRefreshToken);

    res.json({
      token: newAccessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    clearRefreshCookie(res);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
  } catch (_) {}
  clearRefreshCookie(res);
  res.json({ message: 'Déconnexion réussie' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Toujours renvoyer 200 pour éviter l'énumération des emails (OWASP A01)
  res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });

  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active || user.googleId) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user.email, user.name, resetUrl);
  } catch (err) {
    console.error('Forgot-password error:', err);
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requis'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Mot de passe : au moins une majuscule')
    .matches(/[0-9]/).withMessage('Mot de passe : au moins un chiffre'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
        active: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpires: null,
        refreshToken: null,
      },
    });

    clearRefreshCookie(res);
    res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
