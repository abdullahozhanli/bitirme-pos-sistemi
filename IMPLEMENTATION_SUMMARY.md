# RBAC ve Durum Makinesi Implementasyon Özeti

## 📋 Yapılan Değişiklikler

### Backend

#### 1. Modeller

**Güncellenen Modeller:**
- `backend/models/User.js` - `role`, `name`, `active`, `branchId` eklendi
- `backend/models/Order.js` - Status enum güncellendi, `tableId`, `waiterId` eklendi, `isPaid` kaldırıldı
- `backend/models/Product.js` - `station` eklendi
- `backend/models/Order.js` - OrderItem schema güncellendi: `kitchenStatus` → `status`, `note`, `station` eklendi

**Yeni Modeller:**
- `backend/models/Table.js` - Masa yönetimi
- `backend/models/Payment.js` - Ödeme kayıtları
- `backend/models/OrderEvent.js` - Audit log
- `backend/models/StockMovement.js` - Stok hareketleri
- `backend/models/DailyAggregate.js` - Günlük özetler

#### 2. Middleware

**Yeni:**
- `backend/middleware/requireRole.js` - Role-based access control

**Güncellenen:**
- `backend/middleware/authMiddleware.js` - JWT payload'dan user bilgisi çıkarılıyor

#### 3. Routes

**Yeni Route Dosyaları:**
- `backend/routes/waiterRoutes.js` - Garson endpoint'leri
- `backend/routes/kitchenRoutes.js` - Mutfak endpoint'leri
- `backend/routes/adminRoutes.js` - Admin endpoint'leri

**Güncellenen:**
- `backend/routes/authRoutes.js` - JWT payload'a role, email, name eklendi
- `backend/server.js` - Yeni route'lar eklendi, Socket.io entegre edildi

#### 4. Scripts

**Yeni:**
- `backend/scripts/migrateOrderStatus.js` - Status migration script

#### 5. Socket.io

- `backend/server.js` - Socket.io server entegre edildi
- Gerçek zamanlı güncellemeler: `kitchen.*`, `waiter.*`, `admin.metrics.*` topic'leri

---

### Frontend

#### 1. Context

**Güncellenen:**
- `frontend/src/context/AuthContext.jsx` - `user` state eklendi, JWT decode ediliyor

#### 2. Components

**Yeni:**
- `frontend/src/components/ProtectedRoute.jsx` - Role-based route protection

#### 3. Pages

**Yeni:**
- `frontend/src/pages/WaiterDashboard.jsx` - Garson arayüzü placeholder
- `frontend/src/pages/KitchenQueue.jsx` - Mutfak ekranı placeholder

**Güncellenen:**
- `frontend/src/pages/LoginPage.jsx` - Role'e göre yönlendirme
- `frontend/src/App.jsx` - Yeni route'lar eklendi

---

## 📊 Endpoint Özeti

### Waiter Endpoints
- `POST /api/waiter/orders` - Sipariş oluştur
- `POST /api/waiter/orders/:id/send` - Mutfağa gönder
- `POST /api/waiter/items/:itemId/served` - Servis et
- `POST /api/payments` - Ödeme yap

### Kitchen Endpoints
- `GET /api/kitchen/queue` - Bekleyen siparişler
- `POST /api/kitchen/items/:itemId/start` - Hazırlamaya başla
- `POST /api/kitchen/items/:itemId/ready` - Hazır işaretle

### Admin Endpoints
- `GET /api/admin/stats/today` - Bugünün istatistikleri
- `GET /api/admin/orders` - Sipariş listesi
- `PUT /api/admin/orders/:id/status` - Durum güncelle
- `PUT /api/admin/orders/:id/cancel` - İptal et
- `GET /api/admin/products` - Ürün listesi
- `POST /api/admin/products` - Ürün oluştur
- `PUT /api/admin/products/:id` - Ürün güncelle
- `DELETE /api/admin/products/:id` - Ürün sil
- `GET /api/admin/categories` - Kategori listesi
- `POST /api/admin/categories` - Kategori oluştur
- `PUT /api/admin/categories/:id` - Kategori güncelle
- `DELETE /api/admin/categories/:id` - Kategori sil
- `GET /api/reports/daily` - Günlük rapor (CSV)

---

## 🔄 Durum Makineleri

### Order Status
```
CREATED → SENT_TO_KITCHEN → IN_PREP → READY → SERVED → PAID
                                              ↓
                                          CANCELED
```

**Kurallar:**
- PAID ve CANCELED terminal durumlar (değiştirilemez)
- PAID sipariş iptal edilemez
- Geçersiz geçişler 409 döner

### OrderItem Status
```
QUEUED → STARTED → READY → SERVED
```

---

## 📦 Yeni Bağımlılıklar

### Backend
- `socket.io` - Gerçek zamanlı güncellemeler

---

## 🗂️ Dosya Yapısı

```
backend/
├── models/
│   ├── User.js (güncellendi)
│   ├── Order.js (güncellendi)
│   ├── Product.js (güncellendi)
│   ├── Table.js (yeni)
│   ├── Payment.js (yeni)
│   ├── OrderEvent.js (yeni)
│   ├── StockMovement.js (yeni)
│   └── DailyAggregate.js (yeni)
├── middleware/
│   ├── authMiddleware.js (güncellendi)
│   └── requireRole.js (yeni)
├── routes/
│   ├── authRoutes.js (güncellendi)
│   ├── waiterRoutes.js (yeni)
│   ├── kitchenRoutes.js (yeni)
│   └── adminRoutes.js (yeni)
├── scripts/
│   └── migrateOrderStatus.js (yeni)
└── server.js (güncellendi)

frontend/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx (güncellendi)
│   ├── components/
│   │   └── ProtectedRoute.jsx (yeni)
│   ├── pages/
│   │   ├── LoginPage.jsx (güncellendi)
│   │   ├── WaiterDashboard.jsx (yeni)
│   │   └── KitchenQueue.jsx (yeni)
│   └── App.jsx (güncellendi)
```

---

## ✅ Test Senaryoları

1. **Senaryo A:** Garson sipariş → send → kitchen start→ready → waiter served → payment paid
2. **Senaryo B:** İptal akışı (CREATED/CANCELED ve PAID→CANCELED reddi)
3. **Senaryo C:** Metriklerin artışı (orders, revenue, canceled)

Detaylı test adımları: `backend/tests/integration.http`

---

## 📝 Notlar

1. **Geriye Dönük Uyumluluk:** Eski endpoint'ler (`/api/orders`, `/api/products`, vs.) hala çalışıyor ancak deprecated uyarısı veriyor.

2. **Migration:** Mevcut veriler migration script ile güncellenmeli.

3. **Socket.io:** Frontend'de socket.io client kütüphanesi gerekli (henüz eklenmedi).

4. **Placeholder Sayfalar:** WaiterDashboard ve KitchenQueue şu an placeholder, tam implementasyon gerekli.

---

## 🚀 Sonraki Adımlar

1. Frontend'de socket.io client entegrasyonu
2. WaiterDashboard tam implementasyonu
3. KitchenQueue tam implementasyonu
4. Unit testler
5. E2E testler
6. Production deployment
