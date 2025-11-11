# Admin Paneli Özellik Raporu

## 📋 İçindekiler
1. [Genel Yapı ve Navigasyon](#1-genel-yapı-ve-navigasyon)
2. [Dashboard / İstatistikler](#2-dashboard--istatistikler)
3. [Ürün Yönetimi](#3-ürün-yönetimi)
4. [Kategori Yönetimi](#4-kategori-yönetimi)
5. [Sipariş Yönetimi](#5-sipariş-yönetimi)
6. [Güvenlik ve Yetkilendirme](#6-güvenlik-ve-yetkilendirme)

---

## 1. Genel Yapı ve Navigasyon

### 1.1 Admin Layout (AdminLayout.jsx)
**Açıklama:** Admin panelinin ana yapısını oluşturan layout bileşeni.

**Özellikler:**
- **Material-UI (MUI) Tabanlı Tasarım:** Modern ve profesyonel görünüm
- **Sabit Sidebar (Sol Menü):** 240px genişliğinde, her zaman görünür
- **Üst AppBar:** Başlık ve çıkış butonu içerir
- **Responsive Tasarım:** Mobil ve masaüstü uyumlu

**Menü Öğeleri:**
1. **Admin Paneli** (`/admin`) - Dashboard
2. **Sipariş Yönetimi** (`/admin/siparisler`)
3. **Ürün Yönetimi** (`/admin/urunler`)
4. **Kategori Yönetimi** (`/admin/kategoriler`)
5. **Müşteri Arayüzünü Gör** (`/`) - Müşteri sayfasına geçiş

**Navigasyon Özellikleri:**
- React Router ile sayfa yönlendirmesi
- Aktif sayfa vurgulaması
- Icon'lı menü öğeleri (Material Icons)
- Çıkış yap butonu (üst bar)

**Nasıl Çalışır:**
- `AdminLayout` bileşeni tüm admin sayfalarını sarmalar
- `<Outlet />` ile alt sayfalar render edilir
- `useAuth()` hook'u ile çıkış işlemi yönetilir
- Token localStorage'dan kontrol edilir

---

## 2. Dashboard / İstatistikler

### 2.1 Admin Dashboard (AdminDashboard.jsx)
**Açıklama:** Sistemin genel durumunu gösteren ana kontrol paneli.

**Backend Endpoint:**
- `GET /api/analytics/summary` (Protected - Admin only)

**Gösterilen İstatistikler:**

#### 2.1.1 Üst Kartlar (4 Adet)
1. **Toplam Ciro (Ödenenler)**
   - **Hesaplama:** `isPaid: true` ve `status != 'İptal Edildi'` olan siparişlerin `totalPrice` toplamı
   - **Gösterim:** TL cinsinden, 2 ondalık basamak
   - **Birim:** TL

2. **Toplam Sipariş (İptaller Hariç)**
   - **Hesaplama:** `status != 'İptal Edildi'` olan tüm siparişlerin sayısı
   - **Gösterim:** Adet
   - **Birim:** Adet

3. **Bekleyen Sipariş (Hazırlanıyor)**
   - **Hesaplama:** `status: 'Hazırlanıyor'` olan siparişlerin sayısı
   - **Gösterim:** Adet
   - **Birim:** Adet

4. **Toplam İptal Edilen Sipariş**
   - **Hesaplama:** `status: 'İptal Edildi'` olan siparişlerin sayısı
   - **Gösterim:** Adet
   - **Birim:** Adet

#### 2.1.2 Alt Listeler (2 Adet)

**A. Aktif Bekleyen Masalar**
- **Açıklama:** Şu anda "Hazırlanıyor" durumunda olan siparişlerin masa numaraları
- **Hesaplama:** 
  - `status: 'Hazırlanıyor'` olan siparişler çekilir
  - `tableNumber` değerleri unique hale getirilir
  - Liste formatında gösterilir
- **Gösterim Formatı:** "Masa: X" şeklinde
- **Boş Durum:** "Şu anda bekleyen masa bulunmuyor." mesajı

**B. Sistem Özeti**
- **Toplam Ürün Çeşidi:** `Product.countDocuments()` ile hesaplanır
- **Gösterim:** "Menüdeki Toplam Ürün Çeşidi: X Adet"
- **Gelecek Özellikler:** Toplam kategori sayısı vb. eklenebilir

**Teknik Detaylar:**
- **Material-UI Grid Sistemi:** Responsive kart yerleşimi
  - xs={12}: Mobilde tam genişlik
  - sm={6}: Tablet'te yarım genişlik
  - md={3}: Masaüstünde 4 kart yan yana
- **Loading State:** Veri yüklenirken "İstatistikler yükleniyor..." mesajı
- **Error Handling:** Hata durumunda kullanıcıya mesaj gösterilir
- **Auto-refresh:** Sayfa her yüklendiğinde veriler yeniden çekilir

---

## 3. Ürün Yönetimi

### 3.1 Product Management Page (ProductManagementPage.jsx)
**Açıklama:** Ürünlerin CRUD (Create, Read, Update, Delete) işlemlerini yöneten sayfa.

**Backend Endpoints:**
- `GET /api/products` - Ürün listesi (Public)
- `POST /api/products` - Yeni ürün ekle (Protected)
- `PUT /api/products/:id` - Ürün güncelle (Protected)
- `DELETE /api/products/:id` - Ürün sil (Protected)

### 3.2 Özellikler

#### 3.2.1 Yeni Ürün Ekleme
**Form Alanları:**
- **Adı** (name) - Zorunlu
- **Fiyatı** (price) - Zorunlu, sayı tipi
- **Stok Adedi** (countInStock) - Zorunlu, sayı tipi
- **Açıklama** (description) - Opsiyonel
- **Kategorisi** (category) - Zorunlu, dropdown menü

**Çalışma Mantığı:**
1. Kategoriler sayfa yüklendiğinde çekilir
2. Form submit edildiğinde backend'e POST isteği gönderilir
3. Başarılı olursa ürün listesine eklenir
4. Form temizlenir ve başarı mesajı gösterilir
5. Hata durumunda hata mesajı gösterilir

**Validasyon:**
- Backend'de kategori kontrolü yapılır
- Sayısal alanlar Number'a dönüştürülür

#### 3.2.2 Ürün Listesi ve Görüntüleme
**DataGrid Tablosu Özellikleri:**
- **Material-UI DataGrid:** Profesyonel tablo görünümü
- **Sütunlar:**
  - Adı (200px)
  - Fiyatı (100px) - "X TL" formatında
  - Stok (80px)
  - Kategori (150px) - Populate edilmiş kategori adı gösterilir
  - Açıklama (250px)
  - İşlemler (200px) - Düzenle ve Sil butonları

**Filtreleme ve Arama:**
- **Arama Kutusu:** Ürün adına göre gerçek zamanlı filtreleme
- **Grid Toolbar:** DataGrid'in yerleşik filtreleme, sıralama ve export özellikleri

**Pagination:**
- Sayfa başına 10 veya 25 ürün seçeneği
- Varsayılan: 10 ürün/sayfa

**Kategori Gösterimi:**
- Backend'den gelen veri populate edilmişse (obje) direkt gösterilir
- Eğer ID ise, categories listesinden bulunur ve adı gösterilir
- Bulunamazsa "N/A" gösterilir

#### 3.2.3 Ürün Düzenleme
**Modal Penceresi:**
- "Düzenle" butonuna tıklandığında açılır
- Ürün bilgileri form alanlarına doldurulur
- Tüm alanlar düzenlenebilir:
  - Adı
  - Fiyatı
  - Stok Adedi
  - Açıklama
  - Kategorisi (dropdown)

**Güncelleme İşlemi:**
1. Form verileri toplanır
2. Sayısal değerler Number'a dönüştürülür
3. `PUT /api/products/:id` endpoint'ine istek gönderilir
4. Başarılı olursa liste güncellenir
5. Modal kapanır ve başarı mesajı gösterilir

#### 3.2.4 Ürün Silme
**İşlem Akışı:**
1. "Sil" butonuna tıklanır
2. Onay mesajı gösterilir: "Bu ürünü silmek istediğinizden emin misiniz?"
3. Onaylanırsa `DELETE /api/products/:id` endpoint'ine istek gönderilir
4. Başarılı olursa ürün listeden kaldırılır
5. Başarı mesajı gösterilir

**Güvenlik:**
- Tüm yazma işlemleri (POST, PUT, DELETE) `authMiddleware` ile korunur
- Token kontrolü yapılır

---

## 4. Kategori Yönetimi

### 4.1 Category Management Page (CategoryManagementPage.jsx)
**Açıklama:** Kategorilerin CRUD işlemlerini yöneten sayfa.

**Backend Endpoints:**
- `GET /api/categories` - Kategori listesi (Public)
- `POST /api/categories` - Yeni kategori ekle (Protected)
- `PUT /api/categories/:id` - Kategori güncelle (Protected)
- `DELETE /api/categories/:id` - Kategori sil (Protected)

### 4.2 Özellikler

#### 4.2.1 Yeni Kategori Ekleme
**Form:**
- **Kategori Adı** (name) - Tek alan, zorunlu
- Basit ve hızlı ekleme işlemi

**Validasyon:**
- Backend'de aynı isimli kategori kontrolü yapılır
- Duplicate ise "Bu kategori zaten mevcut" hatası döner

#### 4.2.2 Kategori Listesi
**DataGrid Tablosu:**
- **Sütunlar:**
  - Kategori Adı (300px)
  - Oluşturma Tarihi (200px) - Türkçe tarih formatı
  - İşlemler (200px) - Düzenle ve Sil butonları

**Özellikler:**
- Sayfalama: 10 veya 25 kategori/sayfa
- Tarih formatı: `toLocaleString('tr-TR')` ile Türkçe gösterim
- Loading state mevcut

#### 4.2.3 Kategori Düzenleme
**Modal Penceresi:**
- "Düzenle" butonuna tıklandığında açılır
- Kategori adı düzenlenebilir
- Güncelleme işlemi backend'e gönderilir

#### 4.2.4 Kategori Silme
**İşlem:**
- Onay mesajı ile silme işlemi
- Backend'de kategori bulunamazsa 404 hatası

**Dikkat:**
- Kategori silinirken o kategorideki ürünler kontrol edilmez
- Bu durum veri tutarsızlığına yol açabilir (gelecekte düzeltilebilir)

---

## 5. Sipariş Yönetimi

### 5.1 Order Management Page (OrderManagementPage.jsx)
**Açıklama:** Siparişlerin görüntülenmesi ve durum yönetiminin yapıldığı sayfa.

**Backend Endpoints:**
- `GET /api/orders` - Sipariş listesi (Protected)
- `PUT /api/orders/:id/status` - Sipariş durumu güncelle (Protected)
- `PUT /api/orders/:id/pay` - Siparişi ödendi olarak işaretle (Protected)
- `GET /api/orders/stream` - Canlı güncelleme (SSE - Server-Sent Events) - Opsiyonel

### 5.2 Özellikler

#### 5.2.1 Sipariş Listesi
**DataGrid Tablosu:**
- **Sütunlar:**
  - Sipariş ID (150px) - Son 6 karakter gösterilir
  - Masa No (100px)
  - Toplam Tutar (140px) - "X.XX TL" formatında
  - Durum (140px) - Renkli gösterim:
    - İptal Edildi: Kırmızı, kalın
    - Hazır: Yeşil, kalın
  - Ödendi mi? (110px) - "Evet" / "Hayır" / "—" (iptal edilmişse)
  - Sipariş Tarihi (180px) - Türkçe tarih formatı
  - İşlemler (380px) - Durum güncelleme butonları

**Filtreleme ve Sıralama:**
- Grid Toolbar ile filtreleme
- Varsayılan sıralama: En yeni siparişler önce (-createdAt)
- Sayfalama: 10, 25, 50 sipariş/sayfa

**Canlı Güncelleme (SSE):**
- EventSource ile `/api/orders/stream` endpoint'ine bağlanır
- Yeni sipariş geldiğinde liste otomatik yenilenir
- Hata durumunda sessizce geçilir (opsiyonel özellik)

#### 5.2.2 Sipariş Durumları
**Mevcut Durumlar:**
1. **Hazırlanıyor** - Başlangıç durumu
2. **Hazır** - Sipariş hazır, servis bekleniyor
3. **Servis Edildi** - Müşteriye ulaştı
4. **İptal Edildi** - Sipariş iptal edildi

**Durum Geçişleri:**
- **Hazırlanıyor → Hazır:** "Hazır Yap" butonu
- **Hazır → Servis Edildi:** "Servis Edildi" butonu
- **Herhangi bir durum → İptal Edildi:** "İptal Et" butonu (onay ile)

**Durum Butonları Mantığı:**
- İptal edilmiş siparişlerde durum butonları gösterilmez
- Sadece uygun durum geçişleri için butonlar aktif
- "Servis Edildi" durumundaki siparişler iptal edilemez

#### 5.2.3 Ödeme İşaretleme
**Özellik:**
- "Ödendi Yap" butonu
- Sadece ödenmemiş (`isPaid: false`) ve iptal edilmemiş siparişlerde görünür
- Tıklandığında:
  - `isPaid: true` yapılır
  - `paidAt: new Date()` ayarlanır
  - Backend'e PUT isteği gönderilir

#### 5.2.4 Sipariş Detayları
**Modal Penceresi:**
- "Detay Gör" butonuna tıklandığında açılır
- **Gösterilen Bilgiler:**
  - Masa Numarası
  - Sipariş ID (son 6 karakter)
  - Ürünler Listesi:
    - Her ürün için: "Adet x Ürün Adı"
    - Birim fiyat bilgisi
  - Müşteri Notu (varsa)
  - Toplam Tutar

**Gösterim Formatı:**
- Material-UI List ve ListItem bileşenleri
- Ürünler birim fiyatlarıyla birlikte gösterilir
- Notlar özel bir kutu içinde gösterilir

#### 5.2.5 Backend İşlemleri
**Sipariş Oluşturma (Müşteri Tarafı):**
- Atomik stok düşümü (MongoDB transaction)
- Ürün adı ve fiyat snapshot'ı alınır
- Stok kontrolü yapılır
- Yetersiz stok durumunda hata döner
- Toplam fiyat sunucuda hesaplanır

**Sipariş Durum Güncelleme:**
- Sadece geçerli durumlar kabul edilir
- Durum validasyonu backend'de yapılır

---

## 6. Güvenlik ve Yetkilendirme

### 6.1 Authentication Context (AuthContext.jsx)
**Açıklama:** Tüm uygulama için merkezi kimlik doğrulama yönetimi.

**Özellikler:**
- **Token Yönetimi:**
  - Token localStorage'da saklanır
  - Axios header'larına otomatik eklenir
  - İki format desteklenir:
    - `Authorization: Bearer <token>` (yeni)
    - `x-auth-token: <token>` (eski, geçiş dönemi)

**Otomatik Logout:**
- 401 (Unauthorized) hatası alındığında otomatik çıkış yapılır
- Axios interceptor ile yakalanır

**State Yönetimi:**
- `isAuthenticated`: Giriş durumu
- `login(token)`: Giriş yap
- `logout()`: Çıkış yap

### 6.2 Auth Middleware (authMiddleware.js)
**Açıklama:** Backend'de route koruması için kullanılan middleware.

**Çalışma Mantığı:**
1. Request header'larından token alınır
2. Token yoksa 401 döner
3. JWT verify edilir
4. Decoded token'dan user bilgisi alınır
5. `req.user` içine eklenir
6. `next()` ile bir sonraki middleware'e geçilir

**Token Format Desteği:**
- `Authorization: Bearer <token>`
- `x-auth-token: <token>` (legacy)

### 6.3 Protected Routes (App.jsx)
**Açıklama:** Frontend'de admin sayfalarına erişimi kontrol eder.

**Çalışma Mantığı:**
- `ProtectedRoute` bileşeni `/admin` rotalarını sarmalar
- `isAuthenticated` kontrolü yapılır
- Giriş yapılmamışsa `/login` sayfasına yönlendirilir
- Giriş yapılmışsa `AdminLayout` gösterilir

**Korumalı Endpoints (Backend):**
- `POST /api/products` - Ürün ekle
- `PUT /api/products/:id` - Ürün güncelle
- `DELETE /api/products/:id` - Ürün sil
- `POST /api/categories` - Kategori ekle
- `PUT /api/categories/:id` - Kategori güncelle
- `DELETE /api/categories/:id` - Kategori sil
- `GET /api/orders` - Sipariş listesi
- `PUT /api/orders/:id/status` - Durum güncelle
- `PUT /api/orders/:id/pay` - Ödeme işaretle
- `GET /api/analytics/summary` - Dashboard istatistikleri

**Public Endpoints:**
- `GET /api/products` - Ürün listesi (müşteri için)
- `GET /api/categories` - Kategori listesi (müşteri için)
- `POST /api/orders` - Yeni sipariş oluştur (müşteri için)

---

## 📊 Özet Tablo

| Kategori | Sayfa | Backend Endpoint | Korumalı | CRUD |
|----------|-------|------------------|----------|------|
| **Dashboard** | AdminDashboard | `/api/analytics/summary` | ✅ | R (Read) |
| **Ürün Yönetimi** | ProductManagementPage | `/api/products` | ✅ (CUD) | ✅ |
| **Kategori Yönetimi** | CategoryManagementPage | `/api/categories` | ✅ (CUD) | ✅ |
| **Sipariş Yönetimi** | OrderManagementPage | `/api/orders` | ✅ | R, U |

---

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler
- **Frontend:**
  - React 18
  - React Router v6
  - Material-UI (MUI) v5
  - MUI X DataGrid
  - Axios
  - Context API (Auth, Cart)

- **Backend:**
  - Express.js
  - MongoDB (Mongoose)
  - JWT (JSON Web Token)
  - MongoDB Transactions (sipariş oluşturma)

### State Yönetimi
- React Context API
- Local State (useState)
- LocalStorage (token, masa numarası)

### API İletişimi
- Axios ile RESTful API çağrıları
- Base URL: `VITE_API_URL` environment variable'dan
- Default: `http://localhost:5001`
- Token otomatik header'a eklenir

---

## 🚀 Gelecek Geliştirmeler (Notlar)

1. **Dashboard:**
   - Günlük/haftalık/aylık raporlar
   - Grafik ve chart'lar
   - Toplam kategori sayısı

2. **Ürün Yönetimi:**
   - Resim yükleme özelliği
   - Toplu işlemler
   - Stok uyarıları

3. **Kategori Yönetimi:**
   - Kategori silme kontrolü (ürün kontrolü)
   - Kategori sıralaması

4. **Sipariş Yönetimi:**
   - Filtreleme (durum, masa, tarih)
   - Sipariş arama
   - Toplu durum güncelleme

5. **Güvenlik:**
   - Role-based access control (RBAC)
   - Admin/User ayrımı
   - Session timeout

---

## 📝 Notlar

- Tüm admin işlemleri token ile korunur
- Müşteri tarafı sadece ürün görüntüleme ve sipariş oluşturma yapabilir
- Admin paneli responsive tasarıma sahiptir
- Hata yönetimi tüm sayfalarda mevcuttur
- Loading state'leri kullanıcı deneyimi için eklenmiştir

