# Production Deploy Checklist

## Ortam değişkenleri (backend)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `MONGO_URI` | Evet | MongoDB Atlas veya sunucu URI |
| `JWT_SECRET` | Evet | En az 32 karakter rastgele |
| `NODE_ENV` | Evet | `production` |
| `PORT` | Hayır | Varsayılan `5001` |
| `FRONTEND_ORIGIN` | Evet | Web uygulaması URL (ör. `https://selfkasa.site`) |
| `ALLOW_PUBLIC_REGISTER` | Hayır | `false` ise mobil müşteri kaydı kapanır |

Opsiyonel: `OPENAI_API_KEY`, `USDA_API_KEY` (kalori tahmini)

## Frontend build

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=https://api.selfkasa.site
npm ci
npm run build
```

`dist/` klasörünü nginx veya statik host ile sunun.

## Mobil

`mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://api.selfkasa.site
```

EAS build ile APK/IPA üretin; HTTP production'da kullanmayın.

## CORS ve Socket.io

[`backend/app.js`](../backend/app.js) içinde production origin listesi tanımlıdır. Yeni domain eklerken CORS ve Socket.io `socketOrigins` listesini güncelleyin.

Nginx örneği (Socket.io proxy):

```nginx
location /socket.io/ {
  proxy_pass http://127.0.0.1:5001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## Güvenlik kontrol listesi

- [ ] `JWT_SECRET` güçlü ve gizli
- [ ] `ALLOW_PUBLIC_REGISTER` bilinçli seçildi
- [ ] MongoDB sadece uygulama sunucusu IP'sinden erişilebilir
- [ ] İlk admin: `node backend/scripts/createSuperAdmin.js`
- [ ] `GET /health` izleme ile kontrol ediliyor

## Docker

```bash
docker compose up --build -d
```

Yerel geliştirme için `docker-compose.yml` kök dizindedir.

## CI

`main` branch push'ta GitHub Actions: backend test, frontend lint + build.
