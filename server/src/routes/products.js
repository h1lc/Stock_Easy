const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const xss = require('xss');

const router = express.Router();
const prisma = new PrismaClient();

const sanitize = (str) => str ? xss(str.trim()) : str;

const productValidation = [
  body('reference').trim().notEmpty().isLength({ max: 50 }),
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('price').isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('minThreshold').optional().isInt({ min: 0 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

// GET /api/products
router.get('/', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const { search, categoryId, lowStock, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { active: true };
    if (search) where.name = { contains: sanitize(search), mode: 'insensitive' };
    if (categoryId) where.categoryId = Number(categoryId);
    if (lowStock === 'true') where.quantity = { lte: prisma.product.fields?.minThreshold };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: lowStock === 'true'
          ? { ...where, AND: [{ quantity: { lte: prisma.raw ? undefined : 0 } }] }
          : where,
        include: { category: true, supplier: true },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    // Filter low stock in memory if needed
    const result = lowStock === 'true'
      ? products.filter(p => p.quantity <= p.minThreshold)
      : products;

    res.json({ data: result, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticate, authorize('products:read'),
  param('id').isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const product = await prisma.product.findUnique({
        where: { id: Number(req.params.id) },
        include: { category: true, supplier: true, movements: { take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } } },
      });
      if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// POST /api/products
router.post('/', authenticate, authorize('products:write'), productValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { reference, name, description, price, quantity, minThreshold, unit, categoryId, supplierId } = req.body;

    const existing = await prisma.product.findUnique({ where: { reference: sanitize(reference) } });
    if (existing) return res.status(409).json({ error: 'Référence déjà utilisée' });

    const product = await prisma.product.create({
      data: {
        reference: sanitize(reference),
        name: sanitize(name),
        description: description ? sanitize(description) : null,
        price: Number(price),
        quantity: Number(quantity || 0),
        minThreshold: Number(minThreshold || 5),
        unit: unit || 'unité',
        categoryId: categoryId ? Number(categoryId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
      },
      include: { category: true, supplier: true },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, authorize('products:write'), productValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, price, minThreshold, unit, categoryId, supplierId } = req.body;
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: {
        name: sanitize(name),
        description: description ? sanitize(description) : null,
        price: Number(price),
        minThreshold: Number(minThreshold || 5),
        unit: unit || 'unité',
        categoryId: categoryId ? Number(categoryId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
      },
      include: { category: true, supplier: true },
    });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produit non trouvé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', authenticate, authorize('products:delete'), async (req, res) => {
  try {
    await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { active: false },
    });
    res.json({ message: 'Produit archivé avec succès' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produit non trouvé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
