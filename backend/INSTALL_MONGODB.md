# MongoDB Driver Yükleme

## 🔴 Sorun
`Error: Cannot find module 'mongodb/lib/bulk/common'`

Mongoose'un `mongodb` native driver'ına ihtiyacı var.

## ✅ Çözüm

Backend klasöründe şu komutu çalıştırın:

```bash
npm install mongodb
```

**PowerShell'de:**
```powershell
cd C:\Users\abdul\Desktop\bitirme\backend
npm install mongodb
```

## 🔄 Alternatif: Tüm Bağımlılıkları Yeniden Yükle

Eğer hala sorun varsa:

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Windows PowerShell:**
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

Bu işlem tüm paketleri temizden yükler ve dependency conflict'lerini çözer.

## ✅ Kontrol

Yükleme sonrası:
```bash
npm list mongodb mongoose
```

Her ikisi de yüklü olmalı.





