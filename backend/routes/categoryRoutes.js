const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Category = require('../models/Category');

/**
 * GET /api/categories
 * Public menü kategorileri (branchId filtresi opsiyonel)
 */
router.get('/', async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const filter = {};
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'Geçersiz branchId' });
      }
      filter.branchId = branchId;
    }
    const categories = await Category.find(filter).sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
