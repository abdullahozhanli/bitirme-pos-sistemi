# Self-Servis POS Sistemi (Self Kasa)

Restoranlar için QR kod tabanlı self-servis sipariş ve çok rollü operasyon yönetimi.

## Özellikler

- **Müşteri:** Web kiosk ve mobil uygulama ile QR/masa, menü, sepet, sipariş, sipariş geçmişi, sadakat puanı
- **Admin:** Dashboard, sipariş/masa/ürün/kategori/kampanya/QR yönetimi
- **Garson / Mutfak / Kasa:** Rol bazlı operasyon ekranları
- **Süper admin:** Çok şubeli yapı, kullanıcı ve şube yönetimi
- **Gerçek zamanlı:** Socket.io ile mutfak, masa ve müşteri sipariş güncellemeleri
- **Güvenlik:** JWT, rate limit, production CORS, opsiyonel kayıt kilidi

Detaylı mimari: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Teknolojiler

| Katman | Stack |
|--------|--------|
| Backend | Node.js, Express 5, MongoDB, Mongoose, Socket.io, JWT, bcrypt |
| Web | React 19, Vite 7, MUI 7, React Router 7, TanStack Query, Axios |
| Mobil | Expo 54, React Native, React Navigation |

## Gereksinimler

- Node.js >= 18
- MongoDB (yerel veya Atlas)
- npm

## Hızlı başlangıç

### 1. Klonlama

```bash
git clone <repository-url>
cd bitirme-pos-sistemi
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# .env içinde MONGO_URI ve JWT_SECRET (en az 32 karakter) doldurun
npm install
npm start
```

Örnek `.env`:

```
MONGO_URI=mongodb://localhost:27017/bitirme
JWT_SECRET=<en-az-32-karakter-rastgele-deger>
PORT=5001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
ALLOW_PUBLIC_REGISTER=true
```

### 3. Web (frontend)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Uygulama: http://localhost:5173
- API: http://localhost:5001

### 4. Mobil (Expo)

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

`EXPO_PUBLIC_API_URL` backend adresinize işaret etmeli (fiziksel cihazda PC IP’si).

## Roller

| Rol | Açıklama |
|-----|----------|
| `superadmin` | Tüm şubeler |
| `admin` | Tek şube yönetimi |
| `yetkili` | Geniş personel yetkisi |
| `garson` | Masa / sipariş |
| `mutfak` | Mutfak ekranı |
| `kasa` | Ödeme |
| `musteri` | Self-servis (mobil kayıt) |

Web giriş: http://localhost:5173/login

### İlk admin / personel

- **İlk admin:** Veritabanında admin yoksa, ilk giriş yapan kullanıcı otomatik `admin` olur (geliştirme).
- **Süper admin:** `node backend/scripts/createSuperAdmin.js`
- **Garson / kasa:** `backend/scripts/createGarsonUser.js`, `createKasaUser.js`

Müşteri kaydı (`musteri`): `POST /api/auth/register` — production’da `ALLOW_PUBLIC_REGISTER=false` ile kapatılabilir.

## Demo senaryosu (savunma — 5 adım)

1. **Masa bağla:** Müşteri QR okutur (web `/qr-scan` veya mobil) → masa numarası atanır.
2. **Sipariş ver:** Menüden ürün seçilir, sepet tamamlanır → `POST /api/orders`.
3. **Mutfak:** `/kitchen` ekranında sipariş kalemleri görünür (Socket.io).
4. **Operasyon:** Garson/admin sipariş durumunu günceller.
5. **Ödeme:** `/cashier` — nakit/kart seçimi, masa toplu tahsilat; `Gün özeti` sekmesi. Kasa kullanıcısı: `node backend/scripts/createKasaUser.js`

Müşteri tarafında sipariş durumu: `GET /api/orders/:id` ve Socket.io `customer.{userId}` odası.

## Proje yapısı

```
bitirme-pos-sistemi/
├── backend/          # API + Socket.io
├── frontend/         # Web (müşteri + personel)
├── mobile/           # Expo müşteri uygulaması
├── docs/             # ARCHITECTURE.md, DEPLOY.md
├── docker-compose.yml
└── README.md
```

## API özeti

### Herkese açık (okuma / sipariş)

- `GET /api/products`, `GET /api/categories`
- `POST /api/orders` — sipariş oluştur
- `GET /api/orders/:id` — sipariş detayı (sahiplik kontrolü)
- `POST /api/auth/login`, `POST /api/auth/register` (müşteri, `ALLOW_PUBLIC_REGISTER` ile)

### Müşteri (JWT, rol: musteri)

- `GET /api/orders/mine`, `GET /api/orders/mine/branches`

### Personel / admin

- `/api/admin/*`, `/api/waiter/*`, `/api/kitchen/*`, `/api/cashier/*`, `/api/superadmin/*`

Tam liste için `backend/routes/` klasörüne bakın.

## Geliştirme

```bash
# Backend testleri
cd backend && npm test

# Frontend lint + build
cd frontend && npm run lint && npm run build

# Mobil birim testleri (QR, auth, fiyat, puan yardımcıları)
cd mobile && npm test

# Docker (yerel)
docker compose up --build
```

Production dağıtım: [docs/DEPLOY.md](docs/DEPLOY.md)

## Yedekler

`backups/` klasöründeki JSON dosyaları yerel veri yedekleridir; repoya commit etmeyin (`.gitignore`).

## Lisans

Öğrenme / bitirme projesi amaçlıdır.
