const nodemailer = require('nodemailer');

function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Fallback : log dans la console (développement sans SMTP)
  return null;
}

async function sendResetPasswordEmail(to, name, resetUrl) {
  const transporter = getTransporter();

  const html = `
    <div style="font-family:Calibri,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:8px;">
      <h1 style="color:#2563eb;font-size:24px;margin-bottom:8px;">StockEasy</h1>
      <p style="color:#334155;">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#334155;">Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p style="color:#334155;">Cliquez sur le bouton ci-dessous dans l'heure qui suit :</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
        Réinitialiser mon mot de passe
      </a>
      <p style="color:#64748b;font-size:13px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <p style="color:#64748b;font-size:13px;">Ce lien expire dans <strong>1 heure</strong>.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;">StockEasy — Dupont &amp; Fils</p>
    </div>
  `;

  if (!transporter) {
    // Mode développement : afficher le lien dans la console
    console.log('\n📧 [DEV] Email de réinitialisation pour:', to);
    console.log('🔗 Lien:', resetUrl, '\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'StockEasy <noreply@dupont-fils.fr>',
    to,
    subject: 'Réinitialisation de votre mot de passe StockEasy',
    html,
  });
}

module.exports = { sendResetPasswordEmail };
