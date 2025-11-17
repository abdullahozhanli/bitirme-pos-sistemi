// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// routes
const authRoutes = require('./routes/authRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const waiter = require('./routes/waiter');
const kitchenRoutes = require('./routes/kitchenRoutes');
const kitchen = require('./routes/kitchen');
const cashierRoutes = require('./routes/cashier');
const adminRoutes = require('./routes/adminRoutes');
const admin = require('./routes/admin');
const qrRoutes = require('./routes/qrRoutes');

// Eski route'lar (geriye dönük uyumluluk için - deprecated)
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

dotenv.config();

const app = express();

// CORS whitelist
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Development'ta tüm local network'e izin ver, production'da sadece belirtilen origin'e
const corsOptions = isDevelopment
  ? {
      origin: function (origin, callback) {
        // Development: localhost ve local network IP'lerine izin ver
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) || // 192.168.x.x
            origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) || // 10.x.x.x
            origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/)) { // 172.16-31.x.x
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    }
  : {
      origin: [FRONTEND_ORIGIN],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    };

app.use(cors(corsOptions));

// body parser
app.use(express.json());

// MongoDB connect
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB bağlantısı başarılı.');
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err.message);
    process.exit(1);
  }
};
connectDB();

const PORT = process.env.PORT || 5001;

// Socket.io setup (opsiyonel)
const http = require('http');
const server = http.createServer(app);
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: FRONTEND_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });
  console.log('✅ Socket.io yüklendi');
} catch (err) {
  console.warn('⚠️  Socket.io yüklenemedi, gerçek zamanlı özellikler devre dışı:', err.message);
  console.warn('   Yüklemek için: npm install socket.io');
}

// Socket.io connection handler
if (io) {
  io.on('connection', (socket) => {
    console.log('✅ Socket.io client bağlandı:', socket.id);

    // Kitchen station subscription
    socket.on('subscribe:kitchen', (data) => {
      const { branchId, station } = data;
      const room = `kitchen.${branchId || 'default'}.${station || '*'}`;
      socket.join(room);
      console.log(`📡 Socket ${socket.id} kitchen room'a katıldı: ${room}`);
    });

    // Waiter subscription
    socket.on('subscribe:waiter', (data) => {
      const { waiterId } = data;
      if (waiterId) {
        const room = `waiter.${waiterId}`;
        socket.join(room);
        console.log(`📡 Socket ${socket.id} waiter room'a katıldı: ${room}`);
      }
    });

    // Admin metrics subscription
    socket.on('subscribe:admin', (data) => {
      const { branchId } = data;
      const room = `admin.metrics.${branchId || 'default'}`;
      socket.join(room);
      console.log(`📡 Socket ${socket.id} admin room'a katıldı: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.io client ayrıldı:', socket.id);
    });
  });
}

// Socket.io helper function (global olarak erişilebilir)
app.set('io', io);

// healthcheck
app.get('/health', (req, res) => {
  const state = mongoose.connection.readyState; // 1: connected
  res.status(200).json({ ok: true, db: state === 1 ? 'connected' : 'disconnected' });
});

// root
app.get('/', (req, res) => {
  res.send('Self-Servis POS Backend API çalışıyor.');
});

// api routes - Yeni role-based routing
app.use('/api/auth', authRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/waiter', waiter);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/kitchen', kitchen);
app.use('/api/cashier', cashierRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', admin);
app.use('/api/payments', waiterRoutes); // payments endpoint'i waiterRoutes içinde
app.use('/api/qr', qrRoutes); // QR kod oluşturma

// Eski route'lar (geriye dönük uyumluluk - deprecated)
// TODO: Bu route'lar kaldırılacak, admin routes kullanılmalı
app.use('/api/categories', (req, res, next) => {
  console.warn('[DEPRECATED] /api/categories kullanılıyor. /api/admin/categories kullanın.');
  next();
}, categoryRoutes);
app.use('/api/products', (req, res, next) => {
  console.warn('[DEPRECATED] /api/products kullanılıyor. /api/admin/products kullanın.');
  next();
}, productRoutes);
app.use('/api/orders', (req, res, next) => {
  console.warn('[DEPRECATED] /api/orders kullanılıyor. /api/admin/orders kullanın.');
  next();
}, orderRoutes);
app.use('/api/analytics', (req, res, next) => {
  console.warn('[DEPRECATED] /api/analytics kullanılıyor. /api/admin/stats/today kullanın.');
  next();
}, analyticsRoutes);

// 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Kaynak bulunamadı' });
});

// global error handler (tek tip cevap)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Sunucu hatası',
    details: err.details || undefined,
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde.`);
  console.log(`Network: http://0.0.0.0:${PORT} (tüm network interface'lerinden erişilebilir)`);
  if (io) {
    console.log(`Socket.io aktif.`);
  } else {
    console.log(`Socket.io devre dışı (npm install socket.io ile yükleyebilirsiniz).`);
  }
});
