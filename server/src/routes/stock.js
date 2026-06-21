const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

const movementValidation = [
  body('productId').isInt({ min: 1 }),
  body('type').isIn(['ENTREE', 'SORTIE']),
  body('quantity').isInt({ min: 1 }),
  body('reason').optional().trim().isLength({ max: 200 }),
];

// GET /api/stock/movements
router.get('/movements', authenticate, authorize('stock:read'), async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (productId) where.productId = Number(productId);
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, reference: true } },
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ data: movements, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/stock/movements
router.post('/movements', authenticate, authorize('stock:write'), movementValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { productId, type, quantity, reason } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

    if (type === 'SORTIE' && product.quantity < quantity) {
      return res.status(400).json({ error: `Stock insuffisant. Disponible: ${product.quantity}` });
    }

    const delta = type === 'ENTREE' ? Number(quantity) : -Number(quantity);

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: Number(productId),
          type,
          quantity: Number(quantity),
          reason: reason || null,
          userId: req.user.id,
        },
        include: {
          product: { select: { name: true, reference: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.product.update({
        where: { id: Number(productId) },
        data: { quantity: { increment: delta } },
      }),
    ]);

    res.status(201).json(movement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
