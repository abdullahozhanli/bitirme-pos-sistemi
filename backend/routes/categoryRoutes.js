const express = require('express');
const router = express.Router(); 
const Category = require('../models/Category');
const authMiddleware = require('../middleware/authMiddleware'); // YENİ: Güvenlik görevlisini import et

// --- API Rotalarımız ---

/**
 * @route   POST /api/categories
 * @desc    Yeni bir kategori oluşturur
 * @access  Private (Artık Korumalı)
 */
// YENİ: Araya 'authMiddleware' eklendi.
// Bu, "Bu rotayı çalıştırmadan önce güvenlikten geç" demektir.
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    let category = await Category.findOne({ name });
    if (category) {
      return res.status(400).json({ message: 'Bu kategori zaten mevcut' });
    }
    category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   GET /api/categories
 * @desc    Tüm kategorileri listeler
 * @access  Public (Burası herkese açık kalmalı, 'authMiddleware' YOK)
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Bir kategoriyi ID'sine göre siler
 * @access  Private (Artık Korumalı)
 */
// YENİ: Araya 'authMiddleware' eklendi.
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Bir kategoriyi ID'sine göre günceller
 * @access  Private (Artık Korumalı)
 */
// YENİ: Araya 'authMiddleware' eklendi.
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    category.name = name;
    await category.save();
    res.json(category);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});


// Bu rotaları dışa aktarıyoruz
module.exports = router;