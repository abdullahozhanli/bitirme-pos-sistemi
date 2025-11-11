# Hızlı Çözüm: Role Bilgisi Eksik

## 🔴 Sorun
Console'da "Token'da role bilgisi yok!" hatası görünüyor. Bu, veritabanındaki kullanıcı kaydında `role` alanının olmadığını gösteriyor.

## ✅ Çözüm (3 Seçenek)

### Seçenek 1: Script ile Otomatik Düzeltme (Önerilen)

Backend terminalinde:
```bash
cd backend
node scripts/updateUserRoles.js
```

Bu script:
- Tüm kullanıcılara role ekler
- İlk kullanıcıya `admin`, diğerlerine `waiter` rolü verir
- Eksik `name` alanlarını doldurur

### Seçenek 2: Manuel MongoDB Düzeltme

MongoDB shell'de:
```javascript
use bitirme
db.users.updateMany(
  { role: { $exists: false } },
  { $set: { role: 'waiter', active: true } }
)
// İlk kullanıcıyı admin yap
db.users.updateOne(
  { email: 'admin@example.com' }, // Kendi email'inizi yazın
  { $set: { role: 'admin' } }
)
```

### Seçenek 3: Backend Otomatik Düzeltme (Zaten Eklendi)

Backend'de login endpoint'i artık otomatik olarak:
- Role yoksa `waiter` verir
- Name yoksa email'den oluşturur

**Sadece tekrar giriş yapın!** Backend otomatik olarak düzeltecek.

## 📝 Adımlar

1. **Backend'i yeniden başlatın** (eğer çalışıyorsa):
   ```bash
   cd backend
   # Ctrl+C ile durdurun
   npm start
   ```

2. **Tarayıcıda eski token'ı temizleyin**:
   - F12 → Console
   - `localStorage.removeItem('token')`
   - Sayfayı yenileyin (F5)

3. **Tekrar giriş yapın**:
   - `/login` sayfasına gidin
   - Email ve şifre ile giriş yapın
   - Backend otomatik olarak role ekleyecek

4. **Console'u kontrol edin**:
   - `Login Response:` - `userData.role` olmalı
   - `Decoded Token:` - `decoded.role` olmalı
   - Artık "Token'da role bilgisi yok!" hatası görünmemeli

## 🔍 Test

Console'da şunu çalıştırın:
```javascript
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Role:', payload.role); // 'admin', 'waiter' veya 'kitchen' olmalı
}
```

Eğer hala `undefined` ise, backend'i yeniden başlatıp tekrar giriş yapın.





