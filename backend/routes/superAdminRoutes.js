const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const Branch = require('../models/Branch');
const User = require('../models/User');
const {
  isValidEmail,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} = require('../utils/authValidation');

// Tüm route'lar süper admin gerektirir
router.use(auth, requireSuperAdmin);

/**
 * GET /api/superadmin/branches
 * Tüm branch'leri listele
 */
router.get('/branches', async (req, res, next) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 }).lean();
    res.json(branches);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/superadmin/branches
 * Yeni branch oluştur
 */
router.post('/branches', async (req, res, next) => {
  try {
    const { name, address, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Şube adı zorunludur' });
    }

    // Aynı isimde branch var mı kontrol et
    const existingBranch = await Branch.findOne({ name: name.trim() });
    if (existingBranch) {
      return res.status(400).json({ message: 'Bu isimde bir şube zaten mevcut' });
    }

    const branch = new Branch({
      name: name.trim(),
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      isActive: true,
    });

    await branch.save();
    res.status(201).json(branch);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/superadmin/branches/:id
 * Branch güncelle
 */
router.put('/branches/:id', async (req, res, next) => {
  try {
    const { name, address, phone, email, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Geçersiz branch ID' });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Şube bulunamadı' });
    }

    // İsim değişiyorsa ve başka bir branch'te aynı isim varsa kontrol et
    if (name && name.trim() !== branch.name) {
      const existingBranch = await Branch.findOne({ name: name.trim() });
      if (existingBranch) {
        return res.status(400).json({ message: 'Bu isimde bir şube zaten mevcut' });
      }
      branch.name = name.trim();
    }

    if (address !== undefined) branch.address = address?.trim() || '';
    if (phone !== undefined) branch.phone = phone?.trim() || '';
    if (email !== undefined) branch.email = email?.trim() || '';
    if (isActive !== undefined) branch.isActive = isActive;

    await branch.save();
    res.json(branch);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/superadmin/branches/:id
 * Branch sil (hard delete - gerçekten sil)
 */
router.delete('/branches/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Geçersiz branch ID' });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Şube bulunamadı' });
    }

    // İlişkili modelleri kontrol et
    const User = require('../models/User');
    const Product = require('../models/Product');
    const Category = require('../models/Category');
    const Table = require('../models/Table');
    const Order = require('../models/Order');
    
    const [userCount, productCount, categoryCount, tableCount, orderCount] = await Promise.all([
      User.countDocuments({ branchId: req.params.id }),
      Product.countDocuments({ branchId: req.params.id }),
      Category.countDocuments({ branchId: req.params.id }),
      Table.countDocuments({ branchId: req.params.id }),
      Order.countDocuments({ branchId: req.params.id }),
    ]);

    const hasRelatedData = userCount > 0 || productCount > 0 || categoryCount > 0 || tableCount > 0 || orderCount > 0;

    if (hasRelatedData) {
      return res.status(400).json({ 
        message: 'Bu şubeye ait veriler bulunmaktadır. Şube silinemez.',
        details: {
          users: userCount,
          products: productCount,
          categories: categoryCount,
          tables: tableCount,
          orders: orderCount
        }
      });
    }

    // İlişkili veri yoksa gerçekten sil
    await Branch.findByIdAndDelete(req.params.id);

    res.json({ message: 'Şube başarıyla silindi' });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/superadmin/users
 * Tüm kullanıcıları listele (tüm branch'lerden)
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-passwordHash -password')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/superadmin/users
 * Yeni kullanıcı oluştur (şifre belirleme)
 */
router.post('/users', async (req, res, next) => {
  try {
    const { email, password, name, role, branchId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre zorunludur' });
    }

    const emailLower = String(email).trim().toLowerCase();
    if (!isValidEmail(emailLower)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi girin' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    // Email kontrolü
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Role kontrolü
    const validRoles = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
    const validRole = validRoles.includes(role) ? role : 'musteri';

    // Süper admin branch'e bağlı değil
    const finalBranchId = validRole === 'superadmin' ? null : (branchId || null);

    // Branch kontrolü (süper admin değilse)
    if (finalBranchId && !mongoose.Types.ObjectId.isValid(finalBranchId)) {
      return res.status(400).json({ message: 'Geçersiz branch ID' });
    }

    if (finalBranchId) {
      const branch = await Branch.findById(finalBranchId);
      if (!branch) {
        return res.status(404).json({ message: 'Şube bulunamadı' });
      }
    }

    const userName = name || emailLower.split('@')[0];

    const user = new User({
      email: emailLower,
      passwordHash: password, // pre-save hook otomatik hashleyecek
      name: userName,
      role: validRole,
      branchId: finalBranchId,
      isActive: true,
      passwordMeetsPolicy: true,
    });

    await user.save();

    // Şifreyi response'dan çıkar
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/superadmin/users/:id
 * Kullanıcı güncelle
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const { name, role, branchId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Role kontrolü
    if (role) {
      const validRoles = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
      if (validRoles.includes(role)) {
        user.role = role;
        // Süper admin branch'e bağlı değil
        if (role === 'superadmin') {
          user.branchId = null;
        }
      }
    }

    // Branch kontrolü (süper admin değilse)
    if (branchId !== undefined && user.role !== 'superadmin') {
      if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'Geçersiz branch ID' });
      }

      if (branchId) {
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({ message: 'Şube bulunamadı' });
        }
        user.branchId = branchId;
      } else {
        user.branchId = null;
      }
    }

    if (name !== undefined) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.password;

    res.json(userResponse);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/superadmin/users/:id
 * Kullanıcıyı VERİTABANINDAN tamamen sil (hard delete)
 * Not: superadmin kullanıcılar silinemez
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Süper admin asla silinemez
    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Süper admin kullanıcılar silinemez' });
    }

    // Hard delete - kullanıcıyı tamamen sil
    await User.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/superadmin/users/:id/reset-password
 * Kullanıcı şifresini sıfırla
 */
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || !isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Şifreyi güncelle (pre-save hook otomatik hashleyecek)
    user.passwordHash = password;
    user.passwordMeetsPolicy = true;
    await user.save();

    res.json({ message: 'Şifre başarıyla güncellendi' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;


