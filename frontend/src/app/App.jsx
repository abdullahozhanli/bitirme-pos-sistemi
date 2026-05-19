import React, { useEffect } from 'react'; 
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';

// Global hafızaları import et
import { useAuth } from '../shared/context/AuthContext.jsx'; 
import { useCart } from '../shared/context/CartContext.jsx'; 

// Layout'ları import et
import AdminLayout from '../features/admin/layouts/AdminLayout.jsx';
import SuperAdminLayout from '../features/superadmin/layouts/SuperAdminLayout.jsx';
import WaiterLayout from '../features/waiter/layouts/WaiterLayout.jsx';
import KitchenLayout from '../features/kitchen/layouts/KitchenLayout.jsx';
import CashierLayout from '../features/cashier/layouts/CashierLayout.jsx';
import CustomerLayout from '../features/customer/layouts/CustomerLayout.jsx';

// Sayfa importları
import HomePage from '../features/customer/pages/HomePage.jsx';
import MenuPage from '../features/customer/components/MenuPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import PasswordUpgradePage from '../features/auth/pages/PasswordUpgradePage.jsx';
import AdminDashboard from '../features/admin/pages/AdminDashboard.jsx';
import CategoryManagementPage from '../features/admin/pages/CategoryManagementPage.jsx';
import ProductManagementPage from '../features/admin/pages/ProductManagementPage.jsx';
import CampaignManagementPage from '../features/admin/pages/CampaignManagementPage.jsx';
import OrderManagementPage from '../features/admin/pages/OrderManagementPage.jsx';
import AdminTableManagementPage from '../features/admin/pages/AdminTableManagementPage.jsx';
import KitchenDisplayPage from '../features/kitchen/pages/KitchenDisplayPage.jsx';
import CartPage from '../features/customer/pages/CartPage.jsx';
import QRScannerPage from '../features/customer/pages/QRScannerPage.jsx';
import QRCodeManagementPage from '../features/admin/pages/QRCodeManagementPage.jsx';
import WaiterDashboard from '../features/waiter/pages/WaiterDashboard.jsx';
import WaiterTableManagementPage from '../features/waiter/pages/WaiterTableManagementPage.jsx';
import WaiterOrdersPage from '../features/waiter/pages/WaiterOrdersPage.jsx';
import WaiterOrderCreatePage from '../features/waiter/pages/WaiterOrderCreatePage.jsx';
import CashierDashboard from '../features/cashier/pages/CashierDashboard.jsx';
import SuperAdminDashboard from '../features/superadmin/pages/SuperAdminDashboard.jsx';
import SuperAdminBranchManagement from '../features/superadmin/pages/SuperAdminBranchManagement.jsx';
import SuperAdminUserManagement from '../features/superadmin/pages/SuperAdminUserManagement.jsx';
import Unauthorized from '../features/auth/pages/Unauthorized.jsx';
import ProtectedRoute from '../shared/guards/ProtectedRoute.jsx'; 
import RoleGuard from '../shared/guards/RoleGuard.jsx';

// QR Kod Okuyucu Bileşen (TableSetter)
// URL parametresinden masa numarasını alır ve CartContext'e kaydeder
function TableSetter() {
  const [searchParams] = useSearchParams(); 
  const navigate = useNavigate();
  const { setTableNumber, setBranchId } = useCart();
  
  useEffect(() => {
    const table = searchParams.get('table');
    const branch = searchParams.get('branch');

    if (table) {
      setTableNumber(table);
    } else {
      setTableNumber(null);
    }

    if (branch) {
      setBranchId(branch);
    } else {
      setBranchId(null);
    }

    navigate('/');
  }, [searchParams, setTableNumber, setBranchId, navigate]); 
  
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
      <Route path="/password-upgrade" element={<PasswordUpgradePage />} />
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
        <Route path="kampanyalar" element={<CampaignManagementPage />} />
        <Route path="qr-kodlar" element={<QRCodeManagementPage />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;


