import React, { useEffect } from 'react'; 
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';

// Global hafızaları import et
import { useAuth } from './context/AuthContext.jsx'; 
import { useCart } from './context/CartContext.jsx'; 

// Layout'ları import et
import AdminLayout from './layouts/AdminLayout.jsx';
import SuperAdminLayout from './layouts/SuperAdminLayout.jsx';
import WaiterLayout from './layouts/WaiterLayout.jsx';
import KitchenLayout from './layouts/KitchenLayout.jsx';
import CashierLayout from './layouts/CashierLayout.jsx';
import CustomerLayout from './layouts/CustomerLayout.jsx';

// Sayfa importları
import HomePage from './pages/HomePage.jsx';
import MenuPage from './components/public/MenuPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CategoryManagementPage from './pages/CategoryManagementPage.jsx';
import ProductManagementPage from './pages/ProductManagementPage.jsx';
import OrderManagementPage from './pages/OrderManagementPage.jsx';
import AdminTableManagementPage from './pages/AdminTableManagementPage.jsx';
import KitchenDisplayPage from './pages/KitchenDisplayPage.jsx';
import CartPage from './pages/CartPage.jsx';
import QRScannerPage from './pages/QRScannerPage.jsx';
import QRCodeManagementPage from './pages/QRCodeManagementPage.jsx';
import WaiterDashboard from './pages/WaiterDashboard.jsx';
import WaiterTableManagementPage from './pages/WaiterTableManagementPage.jsx';
import WaiterOrdersPage from './pages/WaiterOrdersPage.jsx';
import WaiterOrderCreatePage from './pages/WaiterOrderCreatePage.jsx';
import CashierDashboard from './pages/CashierDashboard.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx';
import SuperAdminBranchManagement from './pages/SuperAdminBranchManagement.jsx';
import SuperAdminUserManagement from './pages/SuperAdminUserManagement.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx'; 
import RoleGuard from './components/RoleGuard.jsx';
import ViewportProbe from './components/dev/ViewportProbe.tsx';

// QR Kod Okuyucu Bileşen (TableSetter)
// URL parametresinden masa numarasını alır ve CartContext'e kaydeder
function TableSetter() {
  const [searchParams] = useSearchParams(); 
  const navigate = useNavigate();
  const { setTableNumber } = useCart();
  
  useEffect(() => {
    const table = searchParams.get('table');
    if (table) {
      setTableNumber(table);
    } else {
      setTableNumber(null);
    }
    navigate('/');
  }, [searchParams, setTableNumber, navigate]); 
  
  return <div>Masa numarası ayarlanıyor, lütfen bekleyin...</div>;
}

// --- ANA UYGULAMA BİLEŞENİ (APP) ---
function App() {
  // Artık App bileşeni SADECE rotaları yönetmekle sorumlu.
  // Tüm menü ve layout mantığı kendi bileşenlerine taşındı.
  return (
    <>
    <Routes>
      {/* 1. MÜŞTERİ ROTALARI */}
      {/* CustomerLayout'u (üst menü) gösteren tüm rotalar */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/sepet" element={<CartPage />} />
        <Route path="/order" element={<TableSetter />} />
        <Route path="/qr-scan" element={<QRScannerPage />} />
      </Route>

      {/* 2. GİRİŞ ROTASI */}
      {/* (Tek başına, menüsü yok) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* 3. GARSON ROTALARI (KORUMALI) - garson, admin, yetkili */}
      <Route path="/waiter" element={<RoleGuard allowedRoles={['garson', 'admin', 'yetkili']}><WaiterLayout /></RoleGuard>}>
        <Route index element={<WaiterDashboard />} />
        <Route path="tables" element={<WaiterTableManagementPage />} />
        <Route path="orders" element={<WaiterOrdersPage />} />
        <Route path="orders/create" element={<WaiterOrderCreatePage />} />
      </Route>

      {/* 4. MUTFAK ROTALARI (KORUMALI) - mutfak, admin, yetkili */}
      <Route path="/kitchen" element={<RoleGuard allowedRoles={['mutfak', 'admin', 'yetkili']}><KitchenLayout /></RoleGuard>}>
        <Route index element={<KitchenDisplayPage />} />
      </Route>

      {/* 5. KASA ROTALARI (KORUMALI) - kasa, admin, yetkili */}
      <Route path="/cashier" element={<RoleGuard allowedRoles={['kasa', 'admin', 'yetkili']}><CashierLayout /></RoleGuard>}>
        <Route index element={<CashierDashboard />} />
      </Route>

      {/* 6. SÜPER ADMİN ROTALARI (KORUMALI) - sadece superadmin */}
      <Route path="/superadmin" element={<RoleGuard allowedRoles={['superadmin']}><SuperAdminLayout /></RoleGuard>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="branches" element={<SuperAdminBranchManagement />} />
        <Route path="users" element={<SuperAdminUserManagement />} />
      </Route>

      {/* 7. ADMİN ROTALARI (KORUMALI) - sadece admin */}
      {/* '/admin' ile başlayan tüm yollar ÖNCE 'RoleGuard'a gider */}
      <Route path="/admin" element={<RoleGuard allowedRoles={['admin']}><AdminLayout /></RoleGuard>}>
        {/* 'RoleGuard' içindeki 'AdminLayout'un <Outlet>'ine yüklenecekler: */}
        <Route index element={<AdminDashboard />} /> 
        <Route path="siparisler" element={<OrderManagementPage />} />
        <Route path="masalar" element={<AdminTableManagementPage />} />
        <Route path="urunler" element={<ProductManagementPage />} />
        <Route path="kategoriler" element={<CategoryManagementPage />} />
        <Route path="qr-kodlar" element={<QRCodeManagementPage />} />
      </Route>
    </Routes>
    {import.meta.env.DEV && <ViewportProbe />}
    </>
  );
}

export default App;