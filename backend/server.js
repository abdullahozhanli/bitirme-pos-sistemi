// server.js
const path = require('path');
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
const calorieRoutes = require('./routes/calorieRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

// Eski route'lar (geriye dönük uyumluluk için - deprecated)
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

dotenv.config();

const { warnInsecureJwtSecret } = require('./utils/envSecurity');
warnInsecureJwtSecret();

// Başlangıç log'u
console.log('\n🔧 Backend başlatılıyor...');
console.log(`📁 Çalışma Dizini: ${process.cwd()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔑 PORT: ${process.env.PORT || 5001}`);

const app = express();

// Production güvenlik middleware'leri
const isDevelopment = process.env.NODE_ENV !== 'production';

// Helmet.js - HTTP header güvenliği
if (!isDevelopment) {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: false, // Socket.io için gerekli
    crossOriginEmbedderPolicy: false
  }));
}

// Rate limiting - API abuse koruması
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: isDevelopment ? 1000 : 100, // Development'ta daha yüksek limit
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- YENİ CORS AYARI BAŞLANGIÇ ---
app.use(cors({
  origin: (origin, callback) => {
    // Production origin'ler
    const allowedOrigins = [
      'https://selfkasa.site',
      'https://www.selfkasa.site',
      'https://api.selfkasa.site',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      process.env.FRONTEND_ORIGIN
    ].filter(Boolean); // undefined değerleri temizle

    // Origin yoksa (Postman, curl, mobile app gibi) kabul et
    if (!origin) {
      return callback(null, true);
    }

    // Allowed list'te varsa kabul et
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Local network IP'lerini kabul et (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    // Port numarası da dahil (5173, 3000 gibi development portları)
    const isLocalNetwork = /^http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    if (isLocalNetwork) {
      return callback(null, true);
    }

    // Diğer durumlarda reddet
    callback(new Error('CORS policy tarafından izin verilmedi'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
// --- YENİ CORS AYARI BİTİŞ ---

// body parser
app.use(express.json({ limit: '2mb' }));

// Profil ve diğer yüklenen dosyalar (kalıcı URL)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (tüm istekleri logla - route'lardan ÖNCE)
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('tr-TR');
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// MongoDB connect
console.log('\n📦 MongoDB bağlantısı kuruluyor...');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı!');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bitirme';
    // URI'yi gizle (sadece host göster)
    const uriParts = mongoUri.split('@');
    if (uriParts.length > 1) {
      console.log(`   Host: ${uriParts[1]}`);
    } else {
      console.log(`   URI: ${mongoUri}`);
    }
  } catch (err) {
    console.error('❌ MongoDB bağlantı hatası:', err.message);
    console.error('   Lütfen .env dosyasındaki MONGO_URI değerini kontrol edin');
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
  console.log('✅ Socket.io yüklendi');
} catch (err) {
  console.warn('⚠️  Socket.io yüklenemedi, gerçek zamanlı özellikler devre dışı:', err.message);
  console.warn('   Yüklemek için: npm install socket.io');
}

// Socket.io connection handler
if (io) {
  io.on('connection', (socket) => {
    // Debug: Tüm gelen event'leri logla (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      socket.onAny((event, ...args) => {
        // Callback fonksiyonunu loglamamak için kontrol
        const filteredArgs = args.filter(arg => typeof arg !== 'function');
        if (event && event.startsWith && event.startsWith('subscribe:')) {
          console.log(`🔍 [DEBUG] Client ${socket.id} event gönderdi: ${event}`, filteredArgs);
        }
      });
    }

    // Kitchen station subscription
    socket.on('subscribe:kitchen', (data) => {
      const { branchId, station } = data || {};
      const branch = branchId || 'default';
      
      if (station === '*' || !station) {
        // Tüm istasyonlara subscribe ol
        const stations = ['hot', 'cold', 'bar', 'dessert'];
        stations.forEach(st => {
          const room = `kitchen.${branch}.${st}`;
          socket.join(room);
        });
        // Genel mutfak room'una da katıl
        const generalRoom = `kitchen.${branch}`;
        socket.join(generalRoom);
      } else {
        // Spesifik istasyona subscribe ol
        const room = `kitchen.${branch}.${station}`;
        socket.join(room);
        // Genel mutfak room'una da katıl
        socket.join(`kitchen.${branch}`);
      }
    });

    // Waiter subscription
    socket.on('subscribe:waiter', (data) => {
      const { waiterId } = data;
      if (waiterId) {
        const room = `waiter.${waiterId}`;
        socket.join(room);
      }
    });

    // Admin metrics subscription
    socket.on('subscribe:admin', (data) => {
      const { branchId } = data;
      const room = `admin.metrics.${branchId || 'default'}`;
      socket.join(room);
    });

    // Tables subscription (admin ve garson için)
    socket.on('subscribe:tables', () => {
      socket.join('tables');
    });

    socket.on('disconnect', () => {
      // Sessizce ayrıl
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
// Sıkı authLimiter burada /me + refresh döngüsünü 401/429'a düşürüyordu; login/register için route içinde limit kullanın
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/waiter', waiter);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/kitchen', kitchen);
app.use('/api/cashier', cashierRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', admin);
app.use('/api/payments', waiterRoutes); // payments endpoint'i waiterRoutes içinde
app.use('/api/qr', qrRoutes); // QR kod oluşturma
app.use('/api/calorie', calorieRoutes);

// Eski route'lar (geriye dönük uyumluluk - deprecated)
// TODO: Bu route'lar kaldırılacak, admin routes kullanılmalı
app.use('/api/categories', (req, res, next) => {
  // Sadece POST/PUT/DELETE için uyarı göster (GET public endpoint)
  if (req.method !== 'GET') {
    console.warn('[DEPRECATED] /api/categories kullanılıyor. /api/admin/categories kullanın.');
  }
  next();
}, categoryRoutes);
app.use('/api/products', (req, res, next) => {
  // Sadece POST/PUT/DELETE için uyarı göster (GET public endpoint)
  if (req.method !== 'GET') {
    console.warn('[DEPRECATED] /api/products kullanılıyor. /api/admin/products kullanın.');
  }
  next();
}, productRoutes);
app.use('/api/orders', (req, res, next) => {
  // PUT/DELETE için uyarı göster (GET ve POST public kalabilir)
  if (req.method === 'PUT' || req.method === 'DELETE') {
    console.warn('[DEPRECATED] /api/orders kullanılıyor. /api/admin/orders kullanın.');
  }
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
  // Production'da detaylı error bilgisi gösterme
  if (isDevelopment) {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }
  
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Sunucu hatası',
    // Production'da details gösterme
    ...(isDevelopment && { details: err.details }),
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🚀 BACKEND SERVER BAŞLATILDI');
  console.log('========================================');
  console.log(`📡 Sunucu http://localhost:${PORT} üzerinde çalışıyor`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT} (tüm network interface'lerinden erişilebilir)`);
  console.log(`📅 Başlangıç Zamanı: ${new Date().toLocaleString('tr-TR')}`);
  if (io) {
    console.log(`✅ Socket.io aktif`);
  } else {
    console.log(`⚠️  Socket.io devre dışı (npm install socket.io ile yükleyebilirsiniz)`);
  }
  console.log('========================================\n');
});
