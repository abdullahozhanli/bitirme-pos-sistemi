# Ortam Değişkenleri Kurulumu

Backend klasöründe `.env` dosyası oluşturmanız gerekiyor.

Aşağıdaki içeriği kullanabilirsiniz:

```
MONGO_URI=mongodb://localhost:27017/bitirme
JWT_SECRET=supersecretkey123456789changeinproduction
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
```

## Adımlar:

1. Backend klasöründe `.env` dosyası oluşturun
2. Yukarıdaki içeriği kopyalayın
3. MongoDB bağlantı string'inizi düzenleyin
4. JWT_SECRET'ı güvenli bir değerle değiştirin

**ÖNEMLİ:** `.env` dosyası `.gitignore`'da olduğu için commit edilmeyecektir.

