# RUNBOOK - RBAC ve Durum Makinesi Migrasyonu

## 📋 Genel Bakış

Bu dokümantasyon, RBAC (Role-Based Access Control) ve durum makinesi implementasyonunun migrasyon ve geri alma adımlarını içerir.

---

## 🚀 Migrasyon Adımları

### 1. Ön Hazırlık

#### 1.1 Veritabanı Yedekleme
```bash
# MongoDB yedek al
mongodump --uri="mongodb://localhost:27017/bitirme" --out=./backup-$(date +%Y%m%d-%H%M%S)
```

#### 1.2 Kod Yedekleme
```bash
# Git commit (eğer kullanılıyorsa)
git add .
git commit -m "Pre-migration backup"
git tag pre-rbac-migration
```

#### 1.3 Bağımlılıkları Güncelle
```bash
cd backend
npm install socket.io
```

---

### 2. Veri Migrasyonu

#### 2.1 Migration Script Çalıştırma
```bash
cd backend
node scripts/migrateOrderStatus.js
```

**Beklenen Çıktı:**
```
✅ MongoDB bağlantısı başarılı
📦 Toplam X sipariş bulundu
✅ Order 123... güncellendi: Hazırlanıyor → IN_PREP
...
📊 Özet:
   ✅ Güncellenen: X
   ⏭️  Atlanan: Y
   ❌ Hatalar: 0
✅ Migration tamamlandı
```

#### 2.2 Migration Sonrası Kontrol
```bash
# MongoDB'de kontrol et
mongosh bitirme
> db.orders.findOne({ status: { $in: ['Hazırlanıyor', 'Hazır', 'Servis Edildi'] } })
# Sonuç null olmalı (tüm eski status'lar güncellenmiş olmalı)
```

---

### 3. Backend Başlatma

#### 3.1 Environment Variables Kontrolü
`.env` dosyasında şunlar olmalı:
```env
MONGO_URI=mongodb://localhost:27017/bitirme
JWT_SECRET=supersecretkey123456789changeinproduction
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
```

#### 3.2 Backend Başlat
```bash
cd backend
npm start
```

**Beklenen Çıktı:**
```
MongoDB bağlantısı başarılı.
Sunucu http://localhost:5001 üzerinde.
Socket.io aktif.
```

---

### 4. Frontend Başlatma

#### 4.1 Frontend Başlat
```bash
cd frontend
npm run dev
```

---

### 5. Test Senaryoları

#### 5.1 Admin Kullanıcı Oluşturma
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "admin"
  }'
```

#### 5.2 Garson Kullanıcı Oluşturma
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "waiter@example.com",
    "password": "waiter123",
    "name": "Garson User",
    "role": "waiter"
  }'
```

#### 5.3 Mutfak Kullanıcı Oluşturma
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kitchen@example.com",
    "password": "kitchen123",
    "name": "Mutfak User",
    "role": "kitchen"
  }'
```

---

## ⚠️ Geri Alma (Rollback)

### 1. Migration Geri Alma

Eğer migration sonrası sorun yaşanırsa:

```bash
cd backend
node scripts/migrateOrderStatus.js --rollback
```

**Dikkat:** Bu işlem tüm status'ları eski Türkçe formatına çevirir. Ancak yeni modeller (Payment, OrderEvent, vs.) silinmez.

### 2. Kod Geri Alma

```bash
# Git kullanıyorsanız
git checkout pre-rbac-migration
# veya
git reset --hard pre-rbac-migration
```

### 3. Veritabanı Geri Yükleme

```bash
# MongoDB yedeği geri yükle
mongorestore --uri="mongodb://localhost:27017/bitirme" ./backup-YYYYMMDD-HHMMSS
```

---

## 🔍 Sorun Giderme

### Sorun 1: Migration Script Hata Veriyor

**Hata:** `Cannot find module '../models/Order'`

**Çözüm:**
```bash
cd backend
# Script'i backend klasöründen çalıştırdığınızdan emin olun
node scripts/migrateOrderStatus.js
```

---

### Sorun 2: Socket.io Bağlantı Hatası

**Hata:** `Socket.io client bağlanamıyor`

**Çözüm:**
1. Backend'in çalıştığından emin olun
2. CORS ayarlarını kontrol edin (`FRONTEND_ORIGIN`)
3. Frontend'de socket.io client kütüphanesi yüklü mü kontrol edin

---

### Sorun 3: Role-Based Access Denied

**Hata:** `403 - Yetkisiz erişim`

**Çözüm:**
1. Kullanıcının role bilgisinin JWT'de olduğundan emin olun
2. Token'ı decode edip kontrol edin:
   ```javascript
   // Frontend console'da
   const token = localStorage.getItem('token');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log(decoded.user);
   ```

---

### Sorun 4: Order Status Geçişi Çalışmıyor

**Hata:** `409 - Geçersiz durum geçişi`

**Çözüm:**
1. Mevcut status'u kontrol edin
2. Terminal durumlar (PAID, CANCELED) değiştirilemez
3. Geçerli geçişler:
   - CREATED → SENT_TO_KITCHEN → IN_PREP → READY → SERVED → PAID
   - Herhangi bir durumdan → CANCELED (PAID hariç)

---

## 📊 Doğrulama Kontrol Listesi

- [ ] Migration script başarıyla çalıştı
- [ ] Tüm eski status'lar yeni enum'a çevrildi
- [ ] Backend başarıyla başladı (Socket.io aktif)
- [ ] Frontend başarıyla başladı
- [ ] Admin kullanıcı oluşturuldu ve giriş yapıldı
- [ ] Garson kullanıcı oluşturuldu ve giriş yapıldı
- [ ] Mutfak kullanıcı oluşturuldu ve giriş yapıldı
- [ ] Role-based routing çalışıyor
- [ ] Yeni endpoint'ler test edildi
- [ ] Socket.io bağlantısı test edildi
- [ ] OrderEvent kayıtları oluşuyor
- [ ] DailyAggregate güncelleniyor

---

## 📝 Notlar

1. **Mevcut Veri:** Migration script mevcut verileri korur, sadece status değerlerini günceller.

2. **Geriye Dönük Uyumluluk:** Eski endpoint'ler (`/api/orders`, `/api/products`, vs.) hala çalışıyor ancak deprecated uyarısı veriyor.

3. **Yeni Modeller:** Table, Payment, OrderEvent, StockMovement, DailyAggregate modelleri yeni oluşturuldu. Mevcut verilerle uyumlu.

4. **Socket.io:** Gerçek zamanlı güncellemeler için Socket.io entegre edildi. Frontend'de client kütüphanesi gerekli.

---

## 🆘 Acil Durum

Eğer kritik bir sorun yaşanırsa:

1. **Hemen durdur:** Backend ve frontend'i durdurun
2. **Yedek kontrol:** Son yedeğin alındığından emin olun
3. **Rollback:** Migration'ı geri alın
4. **Log kontrol:** Hata loglarını inceleyin
5. **Destek:** Geliştirici ekibiyle iletişime geçin

---

## 📞 İletişim

Sorularınız için: [proje geliştirici ekibi]





