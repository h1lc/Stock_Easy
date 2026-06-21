const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', authenticate, authorize('dashboard:read'), async (req, res) => {
  try {
    const [products, movements, orders, alerts] = await Promise.all([
      prisma.product.findMany({ where: { active: true } }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { product: { select: { name: true, reference: true } } },
      }),
      prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { supplier: true } }),
      prisma.product.count({ where: { active: true } }),
    ]);

    const stockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const lowStockProducts = products.filter(p => p.quantity <= p.minThreshold);
    const outOfStockProducts = products.filter(p => p.quantity === 0);

    // Mouvements des 7 derniers jours par jour
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const movementsByDay = last7Days.map(day => {
      const dayMovements = movements.filter(m => m.createdAt.toISOString().split('T')[0] === day);
      return {
        date: day,
        entrees: dayMovements.filter(m => m.type === 'ENTREE').reduce((s, m) => s + m.quantity, 0),
        sorties: dayMovements.filter(m => m.type === 'SORTIE').reduce((s, m) => s + m.quantity, 0),
      };
    });

    res.json({
      kpis: {
        totalProducts: products.length,
        stockValue: Math.round(stockValue * 100) / 100,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        pendingOrders: orders.filter(o => o.status === 'ENVOYE').length,
      },
      recentMovements: movements.slice(0, 10),
      recentOrders: orders,
      movementsByDay,
      topAlerts: lowStockProducts.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        quantity: p.quantity,
        minThreshold: p.minThreshold,
        severity: p.quantity === 0 ? 'RUPTURE' : 'ALERTE',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
