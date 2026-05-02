# Self Kasa — Mobil (orijinal proje)

Backend ile aynı API’yi kullanır. **Expo SDK 54** + React Native (JavaScript).

> Kurulum hata verirse: Metro/Expo’yu kapat, `node_modules` ve `package-lock.json` sil, `npm install` (projede `.npmrc` → `legacy-peer-deps=true`).

## Ortam

`mobile` klasöründe `.env` oluştur (`.env.example`’ı kopyala):

```
EXPO_PUBLIC_API_URL=http://localhost:5001
```

Canlı API için frontend’deki `VITE_API_URL` ile aynı adresi yazabilirsin.

## Çalıştırma

```bash
cd mobile
npm install
npm start
```

- **w** — web
- **a** — Android (emülatör açık olmalı)

## Klasör yapısı

- `src/constants/config.js` — API adresi
- `src/constants/theme.js` — müşteri arayüz renkleri
- `src/api/client.js` — axios instance
- `src/context/AuthContext.jsx` — giriş / kayıt / token
- `src/navigation/RootNavigator.jsx` — stack navigasyon
- `src/screens/LoginScreen.jsx` — tasarıma uygun giriş
- `src/screens/RegisterScreen.jsx` — `musteri` rolü ile kayıt
- `src/screens/HomeScreen.jsx` — QR + profil (placeholder)
- `App.js` — giriş noktası → `src/App.jsx`
