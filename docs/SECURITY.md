# Güvenlik kontrol listesi

## Ortam değişkenleri

- `JWT_SECRET`: en az 32 rastgele karakter; repoya commit etmeyin.
- `MONGO_URI`: yalnızca güvenilir IP’lerden erişim (Atlas IP allowlist).
- `ALLOW_PUBLIC_REGISTER=false` production’da önerilir.
- `ALLOW_DEMO_ONLINE_PAYMENT`: yalnızca yerel geliştirme; production’da kapalı.
- Script şifreleri: `SUPERADMIN_*`, `KASA_*`, `GARSON_*` env ile verin; repoda sabit şifre tutmayın.

## Dağıtım

- API’yi mümkünse reverse proxy (HTTPS) arkasında çalıştırın.
- MongoDB ve backend portunu internete doğrudan açmayın (firewall).
- `FRONTEND_ORIGIN` production CORS’ta tek kaynak olarak tanımlı olsun.
- Üretimde zayıf varsayılan şifreleri rotate edin.

## Uygulama

- Staff API: JWT + rol + `branchId` zorunlu (superadmin hariç).
- Socket.io: bağlantıda JWT; `subscribe:*` odaları rol/şube ile sınırlı.
- Online ödeme: gerçek PSP webhook’u olmadan `paymentConfirmed` production’da reddedilir.
- Legacy route dosyaları (`admin.js`, `waiter.js`, `kitchen.js`) mount edilmez.

## Periyodik

- `npm audit` (CI’da backend/frontend/mobile).
- Bağımlılık güncellemeleri.
- Staging’de smoke test (login, sipariş, kasa tahsilat, yetkisiz erişim 403).

## Olay müdahalesi

1. Etkilenen JWT_SECRET / kullanıcı şifrelerini rotate edin.
2. Şüpheli `Payment` / `Order` kayıtlarını inceleyin.
3. Loglarda anormal `POST /api/orders` hacmini kontrol edin.
