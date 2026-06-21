const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/orders
router.get('/', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          createdBy: { select: { name: true } },
          lines: { include: { product: { select: { name: true, reference: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        supplier: true,
        createdBy: { select: { name: true, email: true } },
        lines: { include: { product: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Bon de commande non trouvé' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/orders — création manuelle ou automatique
router.post('/', authenticate, authorize('orders:write'), [
  body('supplierId').isInt({ min: 1 }),
  body('lines').isArray({ min: 1 }),
  body('lines.*.productId').isInt({ min: 1 }),
  body('lines.*.quantity').isInt({ min: 1 }),
  body('lines.*.unitPrice').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { supplierId, lines, notes } = req.body;

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: Number(supplierId) } });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    const totalPrice = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const reference = `BC-${Date.now()}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        reference,
        supplierId: Number(supplierId),
        createdById: req.user.id,
        totalPrice,
        notes: notes || null,
        lines: {
          create: lines.map(l => ({
            productId: Number(l.productId),
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        },
      },
      include: {
        supplier: true,
        createdBy: { select: { name: true } },
        lines: { include: { product: { select: { name: true, reference: true } } } },
      },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/orders/auto — génération automatique depuis les alertes
router.post('/auto', authenticate, authorize('orders:write'), async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: { active: true, supplier: { isNot: null } },
      include: { supplier: true },
    });

    const alerts = lowStockProducts.filter(p => p.quantity <= p.minThreshold && p.supplierId);
    if (alerts.length === 0) return res.json({ message: 'Aucun produit en rupture nécessitant une commande', orders: [] });

    // Grouper par fournisseur
    const bySupplier = alerts.reduce((acc, p) => {
      if (!acc[p.supplierId]) acc[p.supplierId] = { supplier: p.supplier, products: [] };
      acc[p.supplierId].products.push(p);
      return acc;
    }, {});

    const createdOrders = [];
    for (const [supplierId, group] of Object.entries(bySupplier)) {
      const lines = group.products.map(p => ({
        productId: p.id,
        quantity: Math.max(p.minThreshold * 2 - p.quantity, 1),
        unitPrice: p.price,
      }));
      const totalPrice = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

      const order = await prisma.purchaseOrder.create({
        data: {
          reference: `BC-AUTO-${Date.now()}-${supplierId}`,
          supplierId: Number(supplierId),
          createdById: req.user.id,
          totalPrice,
          notes: 'Bon de commande généré automatiquement',
          lines: { create: lines },
        },
        include: { supplier: true, lines: { include: { product: { select: { name: true } } } } },
      });
      createdOrders.push(order);
    }

    res.status(201).json({ message: `${createdOrders.length} bon(s) de commande créé(s)`, orders: createdOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, authorize('orders:write'), [
  body('status').isIn(['BROUILLON', 'ENVOYE', 'RECU', 'ANNULE']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const order = await prisma.purchaseOrder.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status },
      include: { supplier: true, lines: { include: { product: { select: { name: true } } } } },
    });
    res.json(order);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Bon de commande non trouvé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
