import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css'; 
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Sepet Sağlayıcımızı import et
import { CartProvider } from './context/CartContext.jsx';
// YENİ: Giriş Hafızası Sağlayıcımızı import et
import { AuthProvider } from './context/AuthContext.jsx';
// Toast Provider
import { ToastProvider } from './components/ui/toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* YENİ: En dış katmana AuthProvider'ı ekle */}
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <App />
              </ToastProvider>
            </QueryClientProvider>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);