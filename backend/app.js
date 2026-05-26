const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');

const authRoutes = require('./routes/authRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const waiter = require('./routes/waiter');
const kitchenRoutes = require('./routes/kitchenRoutes');
const kitchen = require('./routes/kitchen');
const cashierRoutes = require('./routes/cashier');
const adminRoutes = require('./routes/adminRoutes');
const admin = require('./routes/admin');
const qrRoutes = require('./routes/qrRoutes');
const calorieRoutes = require('./routes/calorieRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const orderRoutes = require('./routes/orderRoutes');

function createApp() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const app = express();

  if (!isDevelopment) {
    const helmet = require('helmet');
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );
  }

  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 100,
    message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://selfkasa.site',
          'https://www.selfkasa.site',
          'https://api.selfkasa.site',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          process.env.FRONTEND_ORIGIN,
        ].filter(Boolean);

        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);

        const isLocalNetwork =
          /^http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)(:\d+)?$/.test(
            origin
          );
        if (isLocalNetwork) return callback(null, true);

        callback(new Error('CORS policy tarafından izin verilmedi'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  if (isDevelopment) {
    app.use((req, res, next) => {
      const timestamp = new Date().toLocaleString('tr-TR');
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });
  }

  const server = http.createServer(app);
  let io = null;

  try {
    const { Server } = require('socket.io');
    const socketOrigins = [
      'https://selfkasa.site',
      'https://www.selfkasa.site',
      process.env.FRONTEND_ORIGIN,
      ...(isDevelopment
        ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
        : []),
    ].filter(Boolean);

    io = new Server(server, {
      cors: {
        origin: isDevelopment ? true : socketOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    io.on('connection', (socket) => {
      socket.on('subscribe:kitchen', (data) => {
        const { branchId, station } = data || {};
        const branch = branchId || 'default';
        if (station === '*' || !station) {
          ['hot', 'cold', 'bar', 'dessert'].forEach((st) => {
            socket.join(`kitchen.${branch}.${st}`);
          });
          socket.join(`kitchen.${branch}`);
        } else {
          socket.join(`kitchen.${branch}.${station}`);
          socket.join(`kitchen.${branch}`);
        }
      });

      socket.on('subscribe:waiter', (data) => {
        const { waiterId } = data;
        if (waiterId) socket.join(`waiter.${waiterId}`);
      });

      socket.on('subscribe:admin', (data) => {
        const { branchId } = data;
        socket.join(`admin.metrics.${branchId || 'default'}`);
      });

      socket.on('subscribe:tables', () => {
        socket.join('tables');
      });

      socket.on('subscribe:customer', (data) => {
        const userId = data?.userId;
        if (userId) socket.join(`customer.${userId}`);
      });
    });
  } catch (err) {
    console.warn('Socket.io yüklenemedi:', err.message);
  }

  app.set('io', io);

  const mongoose = require('mongoose');
  app.get('/health', (req, res) => {
    const state = mongoose.connection.readyState;
    res.status(200).json({ ok: true, db: state === 1 ? 'connected' : 'disconnected' });
  });

  app.get('/', (req, res) => {
    res.send('Self-Servis POS Backend API çalışıyor.');
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/superadmin', superAdminRoutes);
  app.use('/api/waiter', waiterRoutes);
  app.use('/api/waiter', waiter);
  app.use('/api/kitchen', kitchenRoutes);
  app.use('/api/kitchen', kitchen);
  app.use('/api/cashier', cashierRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', admin);
  app.use('/api/qr', qrRoutes);
  app.use('/api/calorie', calorieRoutes);
  app.use('/api/campaigns', campaignRoutes);

  // Public catalog + customer orders (GET/POST only; mutations via /api/admin)
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: 'Kaynak bulunamadı' });
  });

  app.use((err, req, res, next) => {
    if (isDevelopment) console.error('Error:', err);
    else console.error('Error:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      message: err.message || 'Sunucu hatası',
      ...(isDevelopment && { details: err.details }),
    });
  });

  return { app, server, io };
}

module.exports = { createApp };
