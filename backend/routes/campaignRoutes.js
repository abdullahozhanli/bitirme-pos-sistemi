const express = require('express');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const { isCampaignActive } = require('../utils/pricing');

const router = express.Router();

/**
 * GET /api/campaigns?branchId=
 * Aktif kampanyalar (mobil sepet)
 */
router.get('/', async (req, res, next) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({ message: 'branchId gerekli' });
    }
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Geçersiz branchId' });
    }

    const campaigns = await Campaign.find({
      branchId,
      isActive: true,
    })
      .sort({ sortOrder: 1, minCartTotal: 1 })
      .lean();

    const now = new Date();
    const items = campaigns
      .filter((c) => isCampaignActive(c, now))
      .map((c) => ({
        _id: c._id,
        title: c.title,
        campaignType: c.campaignType || 'cart',
        minCartTotal: c.minCartTotal,
        discountRate: c.discountRate,
        bundlePrice: c.bundlePrice,
        products: Array.isArray(c.products) ? c.products : [],
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        sortOrder: c.sortOrder,
      }));

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
