# CMD ile Temiz Yükleme

## 🔴 Sorun
PowerShell komutları CMD'de çalışmıyor.

## ✅ Çözüm (CMD için)

Backend klasöründe CMD terminalinde şu komutları çalıştırın:

### Adım 1: Eski paketleri temizle
```cmd
cd C:\Users\abdul\Desktop\bitirme\backend
rmdir /s /q node_modules
del package-lock.json
```

### Adım 2: Tüm paketleri yeniden yükle
```cmd
npm install
```

### Adım 3: Backend'i başlat
```cmd
npm start
```

## 📝 Açıklama

- `rmdir /s /q node_modules` - node_modules klasörünü siler
- `del package-lock.json` - package-lock.json dosyasını siler
- `npm install` - Tüm paketleri package.json'dan yeniden yükler

Bu işlem tüm dependency conflict'lerini çözer.





