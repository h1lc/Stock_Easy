const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/alerts — produits en-dessous du seuil minimum
router.get('/', authenticate, authorize('alerts:read'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true, supplier: true },
      orderBy: { quantity: 'asc' },
    });

    const alerts = products
      .filter(p => p.quantity <= p.minThreshold)
      .map(p => ({
        id: p.id,
        reference: p.reference,
        name: p.name,
        quantity: p.quantity,
        minThreshold: p.minThreshold,
        supplier: p.supplier,
        category: p.category,
        severity: p.quantity === 0 ? 'RUPTURE' : 'ALERTE',
        deficit: p.minThreshold - p.quantity,
      }));

    res.json({ data: alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
