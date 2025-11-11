# Environment Variables Setup Guide

## Backend .env Dosyası

`backend/.env` dosyası oluşturun ve aşağıdaki içeriği ekleyin:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/bitirme

# JWT Secret (Production'da güçlü bir secret kullanın!)
JWT_SECRET=supersecretkey123456789changeinproduction

# Server Port
PORT=5001

# Frontend Origin (CORS için)
FRONTEND_ORIGIN=http://localhost:5173
```

## Frontend .env Dosyası

`frontend/.env` dosyası oluşturun (eğer yoksa):

```env
VITE_API_URL=http://localhost:5001
```

## Production Notları

Production ortamında:
- `JWT_SECRET` güçlü ve rastgele bir değer olmalı
- `MONGO_URI` production MongoDB connection string olmalı
- `FRONTEND_ORIGIN` production frontend URL'i olmalı





