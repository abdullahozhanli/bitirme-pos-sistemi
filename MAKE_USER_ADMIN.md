# Kullanıcıyı Admin Yapma

## 🔴 Sorun
Kullanıcının rolü "waiter" ama admin sayfalarına erişmek için "admin" rolü gerekiyor.

## ✅ Çözüm

### Yöntem 1: Script ile (Önerilen)

Backend klasöründe terminal açıp şu komutu çalıştırın:

```bash
cd backend
node scripts/makeUserAdmin.js <email>
```

**Örnek:**
```bash
node scripts/makeUserAdmin.js admin@example.com
```

**Not:** `<email>` yerine giriş yaptığınız email adresini yazın.

### Yöntem 2: MongoDB Shell ile

MongoDB shell'de:

```javascript
use bitirme
db.users.updateOne(
  { email: "admin@example.com" }, // Kendi email'inizi yazın
  { $set: { role: "admin" } }
)
```

### Yöntem 3: Tüm Kullanıcıları Listele

Hangi email ile giriş yaptığınızı bilmiyorsanız:

```bash
cd backend
node scripts/listUsers.js
```

(Bu script'i oluşturmamız gerekebilir)

## 📝 Adımlar

1. **Script'i çalıştırın:**
   ```bash
   cd backend
   node scripts/makeUserAdmin.js <email>
   ```

2. **Tarayıcıda çıkış yapın:**
   - Admin panelinde sağ üstteki çıkış butonuna tıklayın
   - Veya Console'da: `localStorage.removeItem('token')`

3. **Tekrar giriş yapın:**
   - `/login` sayfasına gidin
   - Email ve şifre ile giriş yapın
   - Yeni token'da `role: 'admin'` olacak

4. **Test edin:**
   - Admin panelinden "Ürün Yönetimi" linkine tıklayın
   - Artık "Yetkisiz Erişim" hatası görünmemeli

## 🔍 Hangi Email ile Giriş Yaptınız?

Eğer hangi email ile giriş yaptığınızı bilmiyorsanız, Console'da şunu çalıştırın:

```javascript
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Email:', payload.email);
  console.log('Role:', payload.role);
}
```

Bu email adresini script'te kullanın.





