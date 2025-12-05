import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './WaiterLayout.css';

export default function WaiterLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/waiter', label: 'Anasayfa', icon: 'fas fa-home' },
    { path: '/waiter/tables', label: 'Masa Haritası', icon: 'fas fa-map-marked-alt' },
    { path: '/waiter/orders', label: 'Siparişler', icon: 'fas fa-list-alt' },
    { path: '/waiter/menu', label: 'Menü', icon: 'fas fa-book' },
    { path: '/waiter/reports', label: 'Raporlar', icon: 'fas fa-chart-bar' },
  ];

  const isActive = (path) => {
    if (path === '/waiter') {
      return pathname === '/waiter';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="waiter-layout">
      {/* Sidebar */}
      <aside className="waiter-sidebar">
        {/* Profile Section */}
        <div className="waiter-profile">
          <div className="waiter-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="waiter-profile-info">
            <div className="waiter-name">{user?.name || user?.email || 'Garson'}</div>
            <div className="waiter-role">Garson</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="waiter-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`waiter-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="waiter-sidebar-bottom">
          <button className="waiter-nav-item" onClick={() => {}}>
            <i className="fas fa-cog"></i>
            <span>Ayarlar</span>
          </button>
          <button className="waiter-nav-item" onClick={() => {}}>
            <i className="fas fa-question-circle"></i>
            <span>Yardım</span>
          </button>
          <button className="waiter-nav-item logout-btn" onClick={logout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="waiter-main-content">
        <Outlet />
      </main>
    </div>
  );
}

