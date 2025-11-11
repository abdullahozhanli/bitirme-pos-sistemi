const mongoose = require('mongoose');
const Order = require('../models/Order');

(async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI environment variable is required');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);

    const orders = await Order.find({ 'orderItems.kitchenStatus': { $exists: false } });

    for (const o of orders) {
      o.orderItems = o.orderItems.map(it => ({
        ...(typeof it.toObject === 'function' ? it.toObject() : it),
        kitchenStatus: 'pending',
      }));
      // normalize top-level status as preparing
      o.status = 'Hazırlanıyor';
      await o.save();
    }

    console.log(`Güncellenen sipariş: ${orders.length}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


