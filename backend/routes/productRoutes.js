const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const { formatProductPricing } = require('../utils/pricing');

const router = express.Router();

/**
 * GET /api/products
 * Public menü (Query: page, limit, q, category, inStock, sort, branchId)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      q,
      category,
      inStock,
      branchId,
      sort = '-createdAt',
    } = req.query;

    const filter = {};

    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'Geçersiz branchId' });
      }
      filter.branchId = branchId;
    }

    if (q) filter.name = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (inStock === 'true') filter.countInStock = { $gt: 0 };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total, branch] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
      branchId ? Branch.findById(branchId).select('name').lean() : Promise.resolve(null),
    ]);

    const now = new Date();
    const itemsWithPricing = items.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      const pricing = formatProductPricing(plain, now);
      return { ...plain, ...pricing };
    });

    res.json({
      items: itemsWithPricing,
      branchName: branch?.name || null,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
