const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/products
 * Query: page, limit, q, category, inStock, sort
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      q,
      category,
      inStock,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (inStock === 'true') filter.countInStock = { $gt: 0 };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/products
 * Body: { name, price, description?, imageUrl?, category, countInStock }
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, price, description, imageUrl, category, countInStock } = req.body;

    const cat = await Category.findById(category);
    if (!cat) return res.status(404).json({ message: 'Kategori bulunamadı' });

    const product = new Product({
      name,
      price,
      description,
      imageUrl,
      category: cat._id,
      countInStock: Number(countInStock ?? 0),
    });
    const saved = await product.save();
    const populated = await saved.populate('category', 'name');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.countInStock != null) payload.countInStock = Number(payload.countInStock);
    if (payload.price != null) payload.price = Number(payload.price);

    if (payload.category) {
      const cat = await Category.findById(payload.category);
      if (!cat) return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('category', 'name');

    if (!updated) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json({ message: 'Silindi' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
