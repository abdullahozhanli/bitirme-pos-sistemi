# Uyumluluk Denetimi Raporu

## 📋 Mevcut Kod Taraması Sonuçları

### 1. User Model (`backend/models/User.js`)

**Mevcut Durum:**
- ✅ `email` (String, unique, required)
- ✅ `password` (String, hashed, required)
- ❌ `role` YOK (satır 17-18: yorum olarak belirtilmiş)
- ❌ `name` YOK
- ❌ `active` YOK
- ❌ `branchId` YOK

**Kritik Eksikler:**
- Satır 5-19: Schema'da role, name, active, branchId alanları yok
- Satır 17-18: Role için sadece yorum var, implementasyon yok

---

### 2. Order Model (`backend/models/Order.js`)

**Mevcut Durum:**
- ✅ `orderItems` (Array, required)
  - ✅ `name`, `qty`, `price`, `product` (ref: Product)
  - ⚠️ `kitchenStatus` var ama `status` olmalı (satır 11-16)
  - ❌ `note` YOK (orderItem seviyesinde)
  - ❌ `station` YOK
- ✅ `tableNumber` (String, required)
- ❌ `tableId` YOK (ObjectId ref: Table)
- ❌ `waiterId` YOK (ObjectId ref: User)
- ✅ `notes` (String, default: '')
- ✅ `totalPrice` (Number, required)
- ⚠️ `status` enum uyumsuz (satır 27-32):
  - Mevcut: `'Hazırlanıyor' | 'Hazır' | 'Servis Edildi' | 'İptal Edildi'`
  - Hedef: `'CREATED' | 'SENT_TO_KITCHEN' | 'IN_PREP' | 'READY' | 'SERVED' | 'PAID' | 'CANCELED'`
- ⚠️ `isPaid` (Boolean) var ama `status: 'PAID'` olmalı (satır 33)
- ✅ `paidAt` (Date)
- ✅ `cancelReason` (String)
- ✅ `createdAt` (timestamps: true)

**Kritik Eksikler:**
- Satır 4-19: orderItemSchema'da `note`, `station` yok; `kitchenStatus` → `status` olmalı
- Satır 24: `tableId` yok
- Satır 25: `waiterId` yok
- Satır 27-32: Status enum Türkçe, İngilizce olmalı
- Satır 33: `isPaid` boolean yerine `status: 'PAID'` kullanılmalı

**İndeksler:**
- ✅ Satır 41: `createdAt: -1`
- ✅ Satır 42: `status: 1, createdAt: -1`
- ❌ `orderItems.orderId` index yok (orderItem seviyesinde ayrı collection yoksa gerekli değil)
- ❌ `orderItems.station, orderItems.status` compound index yok

---

### 3. Product Model (`backend/models/Product.js`)

**Mevcut Durum:**
- ✅ `name` (String, required)
- ✅ `price` (Number, required)
- ✅ `description` (String, optional)
- ✅ `imageUrl` (String, optional)
- ✅ `category` (ObjectId ref: Category, required)
- ✅ `countInStock` (Number, required, default: 0)
- ❌ `station` YOK (enum: ['hot', 'cold', 'bar', 'dessert'])

**Kritik Eksikler:**
- Satır 16-48: Schema'da `station` alanı yok

---

### 4. Auth Akışı (`backend/routes/authRoutes.js`)

**Mevcut Durum:**
- ✅ `POST /api/auth/register` - User oluşturur
- ✅ `POST /api/auth/login` - JWT token döner
- ⚠️ JWT payload'da sadece `{ user: { id } }` var (satır 26, 64)
- ❌ `role`, `email`, `name` JWT'de yok

**Kritik Eksikler:**
- Satır 26: Register'da payload'a role, email, name eklenmemiş
- Satır 64: Login'de payload'a role, email, name eklenmemiş

---

### 5. Auth Middleware (`backend/middleware/authMiddleware.js`)

**Mevcut Durum:**
- ✅ Token extraction (x-auth-token veya Authorization Bearer)
- ✅ JWT verify
- ✅ `req.user = decoded.user || { id: decoded.id }`
- ❌ Role kontrolü yok
- ❌ `requireRole` middleware yok

**Kritik Eksikler:**
- Satır 13-24: Sadece token doğrulama var, role kontrolü yok
- `requireRole` middleware dosyası yok

---

### 6. Admin-Only Endpoint'ler

**Mevcut Durum:**
- ✅ `GET /api/orders` - authMiddleware (satır 13, orderRoutes.js)
- ✅ `PUT /api/orders/:id/status` - authMiddleware (satır 129)
- ✅ `PUT /api/orders/:id/pay` - authMiddleware (satır 154)
- ✅ `PUT /api/orders/:id/cancel` - authMiddleware (satır 173)
- ✅ `PUT /api/orders/:orderId/items/:itemIndex/kitchen-status` - authMiddleware (satır 193)
- ✅ `POST /api/products` - authMiddleware (satır 55, productRoutes.js)
- ✅ `PUT /api/products/:id` - authMiddleware (satır 81)
- ✅ `DELETE /api/products/:id` - authMiddleware (satır 107)
- ✅ `POST /api/categories` - authMiddleware (satır 15, categoryRoutes.js)
- ✅ `PUT /api/categories/:id` - authMiddleware (satır 71)
- ✅ `DELETE /api/categories/:id` - authMiddleware (satır 52)
- ✅ `GET /api/analytics/summary` - authMiddleware (satır 16, analyticsRoutes.js)

**Kritik Eksikler:**
- Tüm endpoint'lerde `authMiddleware` var ama `requireRole` yok
- Role-based routing yok (`/api/waiter/*`, `/api/kitchen/*`, `/api/admin/*`)

---

### 7. Eksik Modeller

**Yok:**
- ❌ `Table` modeli
- ❌ `Payment` modeli
- ❌ `OrderEvent` modeli
- ❌ `StockMovement` modeli
- ❌ `DailyAggregate` modeli

---

### 8. Route Yapısı (`backend/server.js`)

**Mevcut Durum:**
- ✅ `app.use('/api/categories', categoryRoutes)`
- ✅ `app.use('/api/products', productRoutes)`
- ✅ `app.use('/api/auth', authRoutes)`
- ✅ `app.use('/api/orders', orderRoutes)`
- ✅ `app.use('/api/analytics', analyticsRoutes)`
- ❌ `/api/waiter/*` route'ları yok
- ❌ `/api/kitchen/*` route'ları yok
- ❌ `/api/admin/*` route'ları yok (mevcut endpoint'ler direkt `/api/*` altında)

**Kritik Eksikler:**
- Role-based route prefixing yok
- Mevcut admin endpoint'leri role-based gruplara taşınmamış

---

## 📊 Özet: Kritik Eksikler Listesi

### Backend

1. **User Model** (`backend/models/User.js`)
   - Satır 5-19: `role`, `name`, `active`, `branchId` alanları eklenmeli

2. **Order Model** (`backend/models/Order.js`)
   - Satır 4-19: orderItemSchema'ya `note`, `station` eklenmeli; `kitchenStatus` → `status` olmalı
   - Satır 21-38: `tableId`, `waiterId` eklenmeli
   - Satır 27-32: Status enum güncellenmeli
   - Satır 33: `isPaid` kaldırılmalı (status: 'PAID' kullanılmalı)

3. **Product Model** (`backend/models/Product.js`)
   - Satır 16-48: `station` alanı eklenmeli

4. **Auth Routes** (`backend/routes/authRoutes.js`)
   - Satır 26: Register payload'a `role`, `email`, `name` eklenmeli
   - Satır 64: Login payload'a `role`, `email`, `name` eklenmeli

5. **Auth Middleware** (`backend/middleware/authMiddleware.js`)
   - Satır 19: `req.user`'a `role` eklenmeli
   - Yeni dosya: `backend/middleware/requireRole.js` oluşturulmalı

6. **Yeni Modeller** (oluşturulmalı)
   - `backend/models/Table.js`
   - `backend/models/Payment.js`
   - `backend/models/OrderEvent.js`
   - `backend/models/StockMovement.js`
   - `backend/models/DailyAggregate.js`

7. **Route Yapısı** (`backend/server.js`)
   - Yeni route dosyaları: `waiterRoutes.js`, `kitchenRoutes.js`, `adminRoutes.js`
   - Mevcut endpoint'ler role-based gruplara taşınmalı

8. **Migration Script** (oluşturulmalı)
   - `backend/scripts/migrateOrderStatus.js`
   - Türkçe status → İngilizce enum
   - `isPaid: true` → `status: 'PAID'`
   - `kitchenStatus` → `status` (orderItem)

### Frontend

1. **AuthContext** (`frontend/src/context/AuthContext.jsx`)
   - Satır 9-10: `user` state'i eklenmeli (id, role, email, name)
   - JWT decode edip user bilgisi çıkarılmalı

2. **ProtectedRoute** (oluşturulmalı)
   - `frontend/src/components/ProtectedRoute.jsx`
   - `allowedRoles` prop ile role kontrolü

3. **Yeni Sayfalar** (oluşturulmalı)
   - `frontend/src/pages/WaiterDashboard.jsx`
   - `frontend/src/pages/KitchenQueue.jsx`
   - `frontend/src/layouts/WaiterLayout.jsx`
   - `frontend/src/layouts/KitchenLayout.jsx`

4. **App.jsx** (`frontend/src/App.jsx`)
   - Satır 79-86: Yeni route'lar eklenmeli (`/waiter/*`, `/kitchen/*`)

---

## ✅ Sonraki Adımlar

1. Modelleri güncelle
2. Yeni modelleri oluştur
3. Migration script yaz
4. RBAC middleware oluştur
5. Route'ları ayır
6. Endpoint'leri implement et
7. Event tracking ekle
8. Socket.io entegre et
9. Frontend iskeletini oluştur
10. Dokümantasyon hazırla





