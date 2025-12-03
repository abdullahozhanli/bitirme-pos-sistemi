# Order Model Migration Rehberi

Bu rehber, Order modelindeki duplikasyonları (table/tableId, waiter/waiterId, items/orderItems, total/totalPrice) güvenli bir şekilde temizlemek için hazırlanmıştır.

## ⚠️ ÖNEMLİ UYARILAR

1. **MUTLAKA YEDEK ALIN** - Migration öncesi yedek alınmadan devam etmeyin!
2. **TEST ORTAMINDA DENEYİN** - Mümkünse önce test ortamında deneyin
3. **PRODUCTION'DA DİKKATLİ** - Production'da yaparken maintenance mode açın

## 📋 ADIM ADIM MİGRATİON

### Adım 1: Yedekleme

```bash
node backend/scripts/backupOrders.js
```

Bu komut:
- Tüm Order'ları `backups/` klasörüne JSON olarak kaydeder
- İstatistikleri de kaydeder
- Timestamp ile dosya adı oluşturur

**Çıktı:** `backups/orders-backup-YYYY-MM-DDTHH-MM-SS-sssZ.json`

### Adım 2: Analiz

```bash
node backend/scripts/analyzeOrders.js
```

Bu komut:
- Hangi field'ların kullanıldığını gösterir
- Migration gerekip gerekmediğini belirler
- Kaç siparişin migrate edileceğini gösterir

**Örnek çıktı:**
```
⚠️  MIGRATION GEREKLİ: 50 siparişte table → tableId kopyalanmalı
⚠️  MIGRATION GEREKLİ: 30 siparişte waiter → waiterId kopyalanmalı
```

### Adım 3: Migration (SADECE ANALİZ BAŞARILIYSA)

```bash
node backend/scripts/migrateOrders.js
```

Bu komut:
- Eski field'ları yeni field'lara kopyalar
- **VERİ KAYBI OLMAZ** - Sadece kopyalama yapar
- Eski field'ları silmez (güvenlik için)

**Yapılan işlemler:**
- `table` → `tableId` (eğer tableId yoksa)
- `waiter` → `waiterId` (eğer waiterId yoksa)
- `total` → `totalPrice` (eğer totalPrice yoksa)
- `items` → `orderItems` (eğer orderItems yoksa, format dönüşümü ile)

### Adım 4: Test

```bash
node backend/scripts/testMigration.js
```

Bu komut:
- Veri kaybı olup olmadığını kontrol eder
- Eski ve yeni field'ların tutarlılığını test eder
- Hataları ve uyarıları gösterir

**Başarılı çıktı:**
```
✅ TÜM TESTLER BAŞARILI!
   Veri kaybı yok, migration başarılı
```

### Adım 5: Kod Güncellemesi (Test Başarılıysa)

Migration başarılıysa, kodda eski field'ları yeni field'larla değiştirin:

- `order.table` → `order.tableId`
- `order.waiter` → `order.waiterId`
- `order.items` → `order.orderItems`
- `order.total` → `order.totalPrice`

### Adım 6: Model Temizliği (Opsiyonel)

Kod güncellemesi tamamlandıktan ve test edildikten sonra, `backend/models/Order.js` dosyasından eski field'ları kaldırabilirsiniz.

## 🔄 ROLLBACK (Geri Alma)

Eğer bir sorun çıkarsa, yedekten geri yükleyebilirsiniz:

```bash
node backend/scripts/rollbackMigration.js backups/orders-backup-YYYY-MM-DDTHH-MM-SS-sssZ.json
```

**⚠️ DİKKAT:** Bu işlem mevcut tüm Order verilerini siler ve yedekten geri yükler!

## 📊 MİGRATİON DETAYLARI

### table → tableId
- Basit kopyalama
- Risk: Düşük

### waiter → waiterId
- Basit kopyalama
- Risk: Düşük

### total → totalPrice
- Basit kopyalama
- Risk: Düşük

### items → orderItems
- Format dönüşümü gerektirir
- `menuItem` → `product` (aynı referans olabilir)
- `station` ve `status` field'ları eklenir (varsayılan değerler)
- Risk: Orta (manuel kontrol önerilir)

## ❓ SIK SORULAN SORULAR

**S: Migration sırasında veri kaybı olur mu?**
C: Hayır, sadece kopyalama yapılır. Eski field'lar silinmez.

**S: Migration geri alınabilir mi?**
C: Evet, yedekten rollback yapabilirsiniz.

**S: Production'da yapabilir miyim?**
C: Evet, ama önce test ortamında deneyin ve maintenance mode açın.

**S: Migration ne kadar sürer?**
C: Sipariş sayısına bağlı. 1000 sipariş için ~1-2 saniye.

## 🆘 YARDIM

Sorun yaşarsanız:
1. Yedek dosyasını kontrol edin
2. Test scriptini çalıştırın
3. Hata mesajlarını okuyun
4. Gerekirse rollback yapın

