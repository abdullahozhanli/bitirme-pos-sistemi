# Rol Tabanlı Sistem Genişletme Analizi

## 📋 Mevcut Sistem Özeti

### Teknoloji Stack
- **Backend:** Node.js + Express.js + MongoDB + Mongoose
- **Frontend:** React 19 + Material UI v7 + React Router v7
- **Auth:** JWT token tabanlı (role yok)
- **Database:** MongoDB (Mongoose ODM)

### Mevcut Modeller

#### User Model (`backend/models/User.js`)
```javascript
{
  email: String (unique, required),
  password: String (hashed, required)
  // ❌ role yok
  // ❌ branchId yok
  // ❌ active yok
}
```

#### Order Model (`backend/models/Order.js`)
```javascript
{
  orderItems: [{
    name: String,
    qty: Number,
    price: Number,
    product: ObjectId (ref: Product),
    kitchenStatus: 'pending' | 'in_progress' | 'ready' | 'served' | 'cancelled'
  }],
  tableNumber: String,
  notes: String,
  totalPrice: Number,
  status: 'Hazırlanıyor' | 'Hazır' | 'Servis Edildi' | 'İptal Edildi', // ❌ Planlanan ile uyumsuz
  isPaid: Boolean,
  paidAt: Date,
  cancelReason: String
  // ❌ waiterId yok
  // ❌ tableId (ObjectId) yok
}
```

#### Product Model (`backend/models/Product.js`)
```javascript
{
  name: String,
  price: Number,
  description: String,
  imageUrl: String,
  category: ObjectId (ref: Category),
  countInStock: Number
  // ❌ station yok
}
```

### Mevcut API Endpoint'leri

#### Auth (`/api/auth`)
- `POST /register` - Admin kaydı (public)
- `POST /login` - Admin girişi (public)

#### Orders (`/api/orders`)
- `GET /` - Sipariş listesi (protected, admin)
- `POST /` - Sipariş oluştur (public, müşteri)
- `PUT /:id/status` - Durum güncelle (protected, admin)
- `PUT /:id/pay` - Ödeme işaretle (protected, admin)
- `PUT /:id/cancel` - İptal et (protected, admin)
- `PUT /:orderId/items/:itemIndex/kitchen-status` - Mutfak durumu (protected, admin)

### Mevcut Frontend Yapısı

#### Routing (`frontend/src/App.jsx`)
- `/` - Müşteri ana sayfa
- `/menu` - Menü
- `/sepet` - Sepet
- `/login` - Giriş
- `/admin/*` - Admin paneli (protected, role kontrolü yok)

#### Auth Context (`frontend/src/context/AuthContext.jsx`)
- Sadece `isAuthenticated` state'i var
- ❌ Role bilgisi yok
- ❌ User bilgisi yok

---

## 🎯 Planlanan Yapı vs Mevcut Durum

### 1. Roller ve Yetkilendirme

#### ❌ Eksikler
- User modelinde `role` alanı yok
- JWT token'da role claim'i yok
- Backend'de role-based middleware yok
- Frontend'de role-based routing yok
- Frontend'de role-based UI kontrolü yok

#### ✅ Yapılması Gerekenler
1. **User Model Güncelleme:**
   ```javascript
   {
     email: String,
     password: String,
     role: { type: String, enum: ['admin', 'waiter', 'kitchen'], default: 'waiter' },
     branchId: { type: Schema.Types.ObjectId, ref: 'Branch' }, // opsiyonel, şimdilik null
     active: { type: Boolean, default: true },
     name: { type: String, required: true }
   }
   ```

2. **JWT Token'a Role Ekleme:**
   ```javascript
   // backend/routes/authRoutes.js
   const payload = { 
     user: { 
       id: user.id,
       role: user.role, // ✅ Ekle
       email: user.email
     } 
   };
   ```

3. **Role-Based Middleware:**
   ```javascript
   // backend/middleware/roleMiddleware.js (YENİ)
   function requireRole(...allowedRoles) {
     return (req, res, next) => {
       if (!req.user?.role) return res.status(403).json({ message: 'Rol bilgisi yok' });
       if (!allowedRoles.includes(req.user.role)) {
         return res.status(403).json({ message: 'Yetkisiz erişim' });
       }
       next();
     };
   }
   ```

4. **Frontend Role Context:**
   ```javascript
   // frontend/src/context/AuthContext.jsx güncelle
   const [user, setUser] = useState(null); // { id, role, email }
   // Token decode edip user bilgisini çıkar
   ```

---

### 2. Durum Makineleri (State Machines)

#### Order.status

**Mevcut:**
```javascript
'Hazırlanıyor' | 'Hazır' | 'Servis Edildi' | 'İptal Edildi'
```

**Planlanan:**
```javascript
'CREATED' → 'SENT_TO_KITCHEN' → 'IN_PREP' → 'READY' → 'SERVED' → 'PAID'
veya → 'CANCELED'
```

#### ❌ Sorunlar
1. Mevcut durumlar Türkçe, planlanan İngilizce
2. Mevcut durumlar planlanan akışa uymuyor
3. `SENT_TO_KITCHEN` ve `IN_PREP` ayrımı yok
4. `PAID` durumu `isPaid` boolean ile ayrı tutuluyor

#### ✅ Çözüm Önerisi
```javascript
// backend/models/Order.js
status: {
  type: String,
  enum: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'PAID', 'CANCELED'],
  default: 'CREATED'
}
// isPaid boolean'ı kaldır, status === 'PAID' kontrolü yap
```

#### OrderItem.status

**Mevcut:**
```javascript
kitchenStatus: 'pending' | 'in_progress' | 'ready' | 'served' | 'cancelled'
```

**Planlanan:**
```javascript
status: 'QUEUED' | 'STARTED' | 'READY' | 'SERVED'
```

#### ✅ Uyumluluk
Mevcut `kitchenStatus` planlanan `status` ile büyük ölçüde uyumlu, sadece isimlendirme farklı:
- `pending` → `QUEUED`
- `in_progress` → `STARTED`
- `ready` → `READY`
- `served` → `SERVED`
- `cancelled` → Order seviyesinde `CANCELED`

---

### 3. Veri Modelleri

#### ❌ Eksik Modeller

1. **Tables Model** (Yok)
   ```javascript
   // backend/models/Table.js (YENİ)
   {
     name: String (required),
     capacity: Number (required),
     status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
     branchId: ObjectId (ref: 'Branch') // opsiyonel
   }
   ```

2. **Payment Model** (Yok)
   ```javascript
   // backend/models/Payment.js (YENİ)
   {
     orderId: ObjectId (ref: 'Order', required),
     method: { type: String, enum: ['cash', 'card', 'online'], required: true },
     amount: Number (required),
     status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
     paidAt: Date,
     createdAt: Date
   }
   ```

3. **OrderEvent Model** (Yok - Audit Log)
   ```javascript
   // backend/models/OrderEvent.js (YENİ)
   {
     orderId: ObjectId (ref: 'Order', required),
     actorId: ObjectId (ref: 'User', required),
     type: { type: String, enum: ['status_change', 'item_status_change', 'payment', 'cancel'], required: true },
     from: String, // önceki durum
     to: String, // yeni durum
     metadata: Schema.Types.Mixed, // ek bilgiler
     at: { type: Date, default: Date.now }
   }
   ```

4. **StockMovement Model** (Yok)
   ```javascript
   // backend/models/StockMovement.js (YENİ)
   {
     productId: ObjectId (ref: 'Product', required),
     delta: Number (required), // pozitif = artış, negatif = azalış
     reason: { type: String, enum: ['order', 'adjustment', 'restock', 'waste'], required: true },
     refId: ObjectId, // orderId veya adjustmentId
     actorId: ObjectId (ref: 'User'),
     createdAt: Date
   }
   ```

5. **DailyAggregate Model** (Yok - Performans için)
   ```javascript
   // backend/models/DailyAggregate.js (YENİ)
   {
     branchId: ObjectId (ref: 'Branch'), // opsiyonel
     date: { type: String, required: true }, // 'YYYYMMDD' format
     revenue: { type: Number, default: 0 },
     orders: { type: Number, default: 0 },
     canceled: { type: Number, default: 0 },
     updatedAt: Date
   }
   ```

#### ✅ Mevcut Modellerde Güncellemeler

1. **Product Model:**
   ```javascript
   // station ekle
   station: { type: String, enum: ['hot', 'cold', 'bar', 'dessert'], default: 'hot' }
   ```

2. **Order Model:**
   ```javascript
   // waiterId ekle
   waiterId: { type: Schema.Types.ObjectId, ref: 'User' },
   // tableId ekle (tableNumber yerine veya birlikte)
   tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
   // status enum güncelle (yukarıda belirtildi)
   ```

---

### 4. API Endpoint'leri

#### Planlanan Endpoint'ler vs Mevcut

| Planlanan | Mevcut | Durum |
|-----------|--------|-------|
| `POST /waiter/orders` | `POST /api/orders` | ⚠️ Public, role kontrolü yok |
| `POST /waiter/orders/{id}/send` | ❌ Yok | ❌ Eksik |
| `POST /kitchen/items/{id}/start` | `PUT /api/orders/:orderId/items/:itemIndex/kitchen-status` | ⚠️ Admin only, kitchen role yok |
| `POST /kitchen/items/{id}/ready` | Aynı endpoint | ⚠️ Admin only |
| `POST /waiter/items/{id}/served` | ❌ Yok | ❌ Eksik |
| `POST /payments` | `PUT /api/orders/:id/pay` | ⚠️ Boolean güncelleme, Payment model yok |
| `POST /orders/{id}/cancel` | `PUT /api/orders/:id/cancel` | ✅ Mevcut |
| `GET /kitchen/queue` | ❌ Yok | ❌ Eksik |
| `GET /admin/stats/today` | `GET /api/analytics/summary` | ✅ Mevcut |
| `GET /reports/daily` | ❌ Yok | ❌ Eksik |

#### ✅ Yapılması Gerekenler

1. **Role-Based Route Prefixing:**
   ```javascript
   // backend/server.js
   const waiterRoutes = require('./routes/waiterRoutes');
   const kitchenRoutes = require('./routes/kitchenRoutes');
   const adminRoutes = require('./routes/adminRoutes');
   
   app.use('/api/waiter', waiterRoutes);
   app.use('/api/kitchen', kitchenRoutes);
   app.use('/api/admin', adminRoutes);
   ```

2. **Yeni Endpoint'ler:**
   - `POST /api/waiter/orders` - Sipariş oluştur (waiter role)
   - `POST /api/waiter/orders/:id/send` - Mutfağa gönder
   - `POST /api/kitchen/items/:id/start` - Hazırlamaya başla
   - `POST /api/kitchen/items/:id/ready` - Hazır bildir
   - `POST /api/waiter/items/:id/served` - Servis edildi
   - `POST /api/payments` - Ödeme kaydet
   - `GET /api/kitchen/queue` - Bekleyen ürün listesi
   - `GET /api/reports/daily` - Günlük rapor (CSV)

---

### 5. Frontend Routing ve Layout

#### ❌ Mevcut Durum
- Sadece `/admin/*` route'ları var
- Role-based routing yok
- Waiter ve Kitchen için ayrı layout yok

#### ✅ Yapılması Gerekenler

1. **Yeni Route Yapısı:**
   ```javascript
   // frontend/src/App.jsx
   <Route path="/waiter" element={<WaiterLayout />}>
     <Route index element={<WaiterDashboard />} />
     <Route path="tables" element={<TableMap />} />
     <Route path="orders" element={<WaiterOrders />} />
   </Route>
   
   <Route path="/kitchen" element={<KitchenLayout />}>
     <Route index element={<KitchenQueue />} />
   </Route>
   
   <Route path="/admin" element={<AdminLayout />}>
     // mevcut admin routes
   </Route>
   ```

2. **Role-Based Route Protection:**
   ```javascript
   // frontend/src/components/ProtectedRoute.jsx (YENİ)
   function ProtectedRoute({ allowedRoles, children }) {
     const { user } = useAuth();
     if (!user) return <Navigate to="/login" />;
     if (!allowedRoles.includes(user.role)) {
       return <Navigate to="/unauthorized" />;
     }
     return children;
   }
   ```

3. **Yeni Layout Bileşenleri:**
   - `WaiterLayout.jsx` - Garson arayüzü
   - `KitchenLayout.jsx` - Mutfak arayüzü
   - `AdminLayout.jsx` - Mevcut (güncelle)

---

### 6. Gerçek Zamanlı Güncellemeler

#### ❌ Mevcut Durum
- WebSocket yok
- Firestore snapshot yok
- Event-driven tetikleyiciler yok

#### ✅ Öneriler

1. **Socket.io Entegrasyonu:**
   ```javascript
   // backend/server.js
   const { Server } = require('socket.io');
   const io = new Server(server, { cors: { origin: FRONTEND_ORIGIN } });
   
   // Order status değiştiğinde
   io.emit('order:updated', order);
   ```

2. **Frontend Socket Hook:**
   ```javascript
   // frontend/src/hooks/useSocket.js (YENİ)
   import { useEffect } from 'react';
   import { io } from 'socket.io-client';
   
   export function useSocket(event, callback) {
     useEffect(() => {
       const socket = io(import.meta.env.VITE_API_URL);
       socket.on(event, callback);
       return () => socket.disconnect();
     }, [event, callback]);
   }
   ```

---

### 7. Event-Driven Tetikleyiciler

#### ❌ Mevcut Durum
- Order status değişiminde otomatik sayaç güncelleme yok
- Stok güncelleme sadece sipariş oluşturulurken yapılıyor
- Daily aggregates otomatik güncellenmiyor

#### ✅ Öneriler

1. **Mongoose Middleware (Hooks):**
   ```javascript
   // backend/models/Order.js
   orderSchema.post('save', async function(doc) {
     // OrderEvent kaydet
     await OrderEvent.create({
       orderId: doc._id,
       actorId: doc.waiterId,
       type: 'status_change',
       from: doc.previousStatus,
       to: doc.status,
       at: new Date()
     });
     
     // DailyAggregate güncelle
     if (doc.status === 'PAID') {
       const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
       await DailyAggregate.findOneAndUpdate(
         { date },
         { $inc: { revenue: doc.totalPrice, orders: 1 } },
         { upsert: true }
       );
     }
   });
   ```

2. **Stock Movement Tracking:**
   ```javascript
   // backend/models/Product.js
   productSchema.post('save', async function(doc) {
     if (this.isModified('countInStock')) {
       const delta = doc.countInStock - this.countInStock;
       if (delta !== 0) {
         await StockMovement.create({
           productId: doc._id,
           delta,
           reason: 'adjustment',
           createdAt: new Date()
         });
       }
     }
   });
   ```

---

## 📊 Uyumluluk Skoru

| Kategori | Uyumluluk | Not |
|----------|-----------|-----|
| **Backend Altyapı** | ✅ %80 | Node.js + Express + MongoDB uygun |
| **Auth Sistemi** | ⚠️ %30 | JWT var ama role yok |
| **Veri Modelleri** | ⚠️ %50 | Temel modeller var, eksikler çok |
| **Durum Makineleri** | ⚠️ %40 | Mevcut durumlar planlananla uyumsuz |
| **API Endpoint'leri** | ⚠️ %40 | Temel CRUD var, role-based routing yok |
| **Frontend Routing** | ⚠️ %20 | Sadece admin route'ları var |
| **Gerçek Zamanlı** | ❌ %0 | WebSocket/Firestore yok |
| **Event Tracking** | ❌ %0 | Audit log yok |

**Genel Uyumluluk: %35**

---

## 🚀 Uygulama Planı (Öncelik Sırasına Göre)

### Faz 1: Temel Altyapı (1-2 hafta)
1. ✅ User modeline `role`, `name`, `active` ekle
2. ✅ JWT token'a role claim ekle
3. ✅ Role-based middleware oluştur
4. ✅ Frontend AuthContext'e user bilgisi ekle
5. ✅ Role-based ProtectedRoute bileşeni

### Faz 2: Veri Modelleri (1 hafta)
1. ✅ Table model oluştur
2. ✅ Payment model oluştur
3. ✅ OrderEvent model oluştur
4. ✅ StockMovement model oluştur
5. ✅ DailyAggregate model oluştur
6. ✅ Order model güncelle (waiterId, tableId, status enum)
7. ✅ Product model güncelle (station)

### Faz 3: Durum Makineleri (1 hafta)
1. ✅ Order.status enum'ını güncelle
2. ✅ OrderItem.status'u standardize et
3. ✅ Durum geçiş validasyonları ekle
4. ✅ OrderEvent kayıtları ekle

### Faz 4: API Endpoint'leri (1-2 hafta)
1. ✅ `/api/waiter/*` route'ları
2. ✅ `/api/kitchen/*` route'ları
3. ✅ `/api/admin/*` route'ları (mevcut endpoint'leri taşı)
4. ✅ `/api/payments` endpoint'i
5. ✅ `/api/kitchen/queue` endpoint'i

### Faz 5: Frontend (2 hafta)
1. ✅ WaiterLayout ve sayfalar
2. ✅ KitchenLayout ve sayfalar
3. ✅ Role-based routing
4. ✅ Role-based UI kontrolleri

### Faz 6: Gerçek Zamanlı ve Event Tracking (1 hafta)
1. ✅ Socket.io entegrasyonu
2. ✅ Mongoose hooks ile event tracking
3. ✅ DailyAggregate otomatik güncelleme

---

## ⚠️ Dikkat Edilmesi Gerekenler

1. **Mevcut Veri Migrasyonu:**
   - Mevcut Order'ların status'larını yeni enum'a çevir
   - Mevcut User'lara default role ataması yap
   - Mevcut `isPaid: true` olan Order'ları `status: 'PAID'` yap

2. **Backward Compatibility:**
   - Eski endpoint'leri bir süre daha destekle
   - Deprecation warning ekle

3. **Performance:**
   - DailyAggregate için index ekle
   - OrderEvent için TTL index (eski kayıtları sil)
   - Socket.io connection pooling

4. **Security:**
   - Role-based middleware her endpoint'te kullan
   - Frontend'de role kontrolü yap ama backend'e güven
   - JWT token expiration süresini kısalt (şu an 360000 çok uzun)

---

## 📝 Sonuç

Mevcut sistem **%35 uyumluluk** gösteriyor. Temel altyapı (Node.js + Express + MongoDB) planlanan yapıya uygun, ancak:

- **Kritik Eksikler:** Role-based auth, durum makinesi, eksik modeller
- **Orta Öncelik:** API endpoint'leri, frontend routing
- **Düşük Öncelik:** Gerçek zamanlı güncellemeler, event tracking

**Tahmini Süre:** 6-8 hafta (tek geliştirici, part-time)

**Önerilen Yaklaşım:** Fazlara bölerek, her fazı test ederek ilerlemek. Önce temel altyapıyı kurmak, sonra özellikleri eklemek.





