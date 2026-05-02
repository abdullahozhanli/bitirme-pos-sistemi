import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { useTheme, useMediaQuery, IconButton, Drawer, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import './WaiterLayout.css';

export default function WaiterLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { path: '/waiter', label: 'Anasayfa', icon: 'fas fa-home' },
    { path: '/waiter/tables', label: 'Masa Haritası', icon: 'fas fa-map-marked-alt' },
  ];

  const isActive = (path) => {
    if (path === '/waiter') {
      return pathname === '/waiter';
    }
    return pathname.startsWith(path);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const sidebarContent = (
    <>
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
            onClick={() => handleNavClick(item.path)}
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
    </>
  );

  return (
    <div className="waiter-layout">
      {/* Mobile: Hamburger Menu Button */}
      {isMobile && (
        <IconButton
          className="waiter-menu-button"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1100,
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Desktop: Fixed Sidebar */}
      {!isMobile && (
        <aside className="waiter-sidebar">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile: Drawer */}
      {isMobile && (
        <>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 280,
                boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
                backgroundColor: '#ffffff',
              },
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              p: 1,
              borderBottom: '1px solid #e0e0e0',
              minHeight: '48px'
            }}>
              <IconButton onClick={handleDrawerToggle} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100% - 48px)',
              backgroundColor: '#ffffff',
              overflowY: 'auto'
            }}>
              {/* Profile Section */}
              <Box sx={{ 
                p: '20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <Box sx={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: '#66bb6a',
                  border: '2px solid #4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'white',
                  flexShrink: 0
                }}>
                  <i className="fas fa-user"></i>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontSize: '16px', fontWeight: 600, mb: '4px', color: '#343a40' }}>
                    {user?.name || user?.email || 'Garson'}
                  </Box>
                  <Box sx={{ fontSize: '13px', color: '#6c757d' }}>
                    Garson
                  </Box>
                </Box>
              </Box>

              {/* Navigation Menu */}
              <Box sx={{ flex: 1, p: '20px 0', overflowY: 'auto' }}>
                {menuItems.map((item) => (
                  <Box
                    key={item.path}
                    component="button"
                    onClick={() => handleNavClick(item.path)}
                    sx={{
                      width: 'calc(100% - 24px)',
                      p: '14px 20px',
                      background: 'none',
                      border: 'none',
                      color: isActive(item.path) ? '#1976d2' : '#6c757d',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '15px',
                      fontWeight: isActive(item.path) ? 600 : 500,
                      borderRadius: '8px',
                      margin: '2px 12px',
                      backgroundColor: isActive(item.path) ? '#e3f2fd' : 'transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: isActive(item.path) ? '#e3f2fd' : '#f5f5f5',
                        color: isActive(item.path) ? '#1976d2' : '#343a40',
                      },
                      '& i': {
                        width: '20px',
                        fontSize: '18px',
                        textAlign: 'center',
                        color: isActive(item.path) ? '#1976d2' : '#9e9e9e',
                      }
                    }}
                  >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </Box>
                ))}
              </Box>

              {/* Bottom Actions */}
              <Box sx={{ p: '20px 0', borderTop: '1px solid #e0e0e0' }}>
                <Box
                  component="button"
                  onClick={() => {}}
                  sx={{
                    width: 'calc(100% - 24px)',
                    p: '14px 20px',
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '15px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    margin: '2px 12px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                      color: '#343a40',
                    },
                    '& i': {
                      width: '20px',
                      fontSize: '18px',
                      color: '#9e9e9e',
                    }
                  }}
                >
                  <i className="fas fa-cog"></i>
                  <span>Ayarlar</span>
                </Box>
                <Box
                  component="button"
                  onClick={() => {}}
                  sx={{
                    width: 'calc(100% - 24px)',
                    p: '14px 20px',
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '15px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    margin: '2px 12px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                      color: '#343a40',
                    },
                    '& i': {
                      width: '20px',
                      fontSize: '18px',
                      color: '#9e9e9e',
                    }
                  }}
                >
                  <i className="fas fa-question-circle"></i>
                  <span>Yardım</span>
                </Box>
                <Box
                  component="button"
                  onClick={logout}
                  sx={{
                    width: 'calc(100% - 24px)',
                    p: '14px 20px',
                    background: 'none',
                    border: 'none',
                    color: '#d32f2f',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '15px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    margin: '2px 12px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#ffebee',
                      color: '#c62828',
                    },
                    '& i': {
                      width: '20px',
                      fontSize: '18px',
                      color: '#d32f2f',
                    }
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Çıkış Yap</span>
                </Box>
              </Box>
            </Box>
          </Drawer>
        </>
      )}

      {/* Main Content */}
      <main className="waiter-main-content">
        <Outlet />
      </main>
    </div>
  );
}

