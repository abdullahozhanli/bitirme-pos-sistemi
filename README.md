# Self-Servis POS Sistemi

Restoranlar için QR kod tabanlı self-servis sipariş sistemi.

## 🚀 Özellikler

- 📱 Müşteri Kiosk Arayüzü: QR kodla masa seçimi, menü görüntüleme, sepete ekleme
- 🔐 Admin Paneli: Dashboard istatistikleri, sipariş yönetimi, ürün/kategori CRUD
- 💳 Sipariş Takibi: Hazırlanıyor/Hazır/Servis Edildi durumları, ödeme işaretleme
- 📊 Analytics: Toplam ciro, sipariş sayıları, bekleyen masalar, iptal edilenler
- 🔒 JWT Authentication: Token tabanlı güvenli admin girişi
- 📦 Stok Yönetimi: Ürün stok takibi, tükenen ürünlerde otomatik uyarı

## 🛠️ Teknolojiler

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs

### Frontend
- React 19
- Material UI v7
- React Router v7
- Axios
- Vite

## 📋 Gereksinimler

- Node.js >= 18
- MongoDB (yerel veya Atlas)
- npm veya yarn

## 🏃 Hızlı Başlangıç

### 1. Repository'yi klonlayın
```bash
git clone <repository-url>
cd bitirme
```

### 2. Backend Kurulumu

```bash
cd backend
npm install
```

`.env` dosyası oluşturun:
```
MONGO_URI=mongodb://localhost:27017/bitirme
JWT_SECRET=supersecretkey123456789changeinproduction
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
```

Backend'i başlatın:
```bash
npm start
# veya: node server.js
```

### 3. Frontend Kurulumu

Yeni terminal'de:
```bash
cd frontend
npm install
npm run dev
```

### 4. Tarayıcıda Açın

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## 📝 İlk Kurulum

### İlk Admin Kullanıcı Oluşturma

Backend'de `.env` dosyası hazır olduktan sonra, **ilk admin kullanıcısını** oluşturun:

```bash
# Backend klasöründe
curl -X POST http://localhost:5001/api/auth/setup-first-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","name":"Admin"}'
```

**Not**: Bu endpoint sadece veritabanında hiç admin yoksa çalışır. İlk admin oluşturulduktan sonra, yeni kullanıcılar sadece admin panelinden eklenebilir.

Sonra `/login` sayfasından giriş yapabilirsiniz.

### İlk Ürün/Kategori Ekleme

Admin paneline giriş yaptıktan sonra:
1. `/admin/kategoriler` → Kategori ekleyin
2. `/admin/urunler` → Ürün ekleyin (stok adedi girin)

## 📁 Proje Yapısı

```
bitirme/
├── backend/
│   ├── models/         # MongoDB şemaları
│   ├── routes/         # API endpoint'leri
│   ├── middleware/     # authMiddleware
│   ├── server.js       # Ana sunucu dosyası
│   └── .env           # Ortam değişkenleri
├── frontend/
│   ├── src/
│   │   ├── pages/      # Sayfa bileşenleri
│   │   ├── components/ # Layout bileşenleri
│   │   ├── context/    # Global state (Auth, Cart)
│   │   ├── App.jsx     # Ana routing
│   │   └── main.jsx    # Entry point
│   └── vite.config.js
└── README.md
```

## 🔑 API Endpoint'leri

### Public
- `GET /api/products` - Ürünleri listele
- `GET /api/categories` - Kategorileri listele
- `POST /api/auth/login` - Admin girişi
- `POST /api/auth/register` - Admin kaydı
- `POST /api/orders` - Sipariş oluştur

### Protected (Admin)
- `GET /api/orders` - Siparişleri listele
- `PUT /api/orders/:id/status` - Durum güncelle
- `PUT /api/orders/:id/pay` - Ödeme işaretle
- `GET /api/analytics/summary` - Dashboard istatistikleri
- `POST /api/products` - Ürün ekle
- `PUT /api/products/:id` - Ürün güncelle
- `DELETE /api/products/:id` - Ürün sil
- `POST /api/categories` - Kategori ekle
- `PUT /api/categories/:id` - Kategori güncelle
- `DELETE /api/categories/:id` - Kategori sil

## 🎯 Kullanım Senaryosu

1. Müşteri QR kodu okutur → Masa numarası belirlenir
2. Menüden ürün seçer → Sepete ekler
3. Sipariş notu ekler → Siparişi tamamlar
4. Admin paneline sipariş gelir → Durum günceller
5. Müşteriye servis edilir → Ödeme işaretlenir

## 🔧 Geliştirme

### Backend Test
```bash
cd backend
npm start
```

### Frontend Dev Mode
```bash
cd frontend
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
```

## 📄 Lisans

Bu proje öğrenme amaçlı geliştirilmiştir.

## 👤 Yazar

Bitirme Projesi - Self-Servis POS Sistemi

---

**Not:** Production'da `.env` dosyasındaki JWT_SECRET ve MongoDB URI'yi güvenli değerlerle değiştirmeyi unutmayın!

