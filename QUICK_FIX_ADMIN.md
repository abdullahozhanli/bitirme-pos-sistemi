# Hızlı Çözüm: Admin Rolü

## 🔴 Sorun
Kullanıcı "waiter" rolü ile giriş yapıyor ama admin sayfalarına erişemiyor.

## ✅ Otomatik Çözüm (Backend'de)

Backend artık **otomatik olarak ilk giriş yapan kullanıcıyı admin yapıyor**.

### Adımlar:

1. **Backend'i yeniden başlatın:**
   ```bash
   cd backend
   # Ctrl+C ile durdurun
   npm start
   ```

2. **Tüm kullanıcıları silin (opsiyonel - sadece test için):**
   - MongoDB'de: `db.users.deleteMany({})`
   - Veya yeni bir email ile kayıt olun

3. **Giriş yapın:**
   - İlk giriş yapan kullanıcı otomatik admin olacak

## 🔧 Manuel Çözüm (MongoDB)

MongoDB shell'de:

```javascript
use bitirme
db.users.updateOne(
  { email: "kendi@email.com" }, // Kendi email'inizi yazın
  { $set: { role: "admin" } }
)
```

Sonra:
1. Tarayıcıda çıkış yapın
2. Tekrar giriş yapın
3. Yeni token'da `role: 'admin'` olacak

## 🔍 Kontrol

Console'da:
```javascript
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Role:', payload.role); // 'admin' olmalı
}
```





