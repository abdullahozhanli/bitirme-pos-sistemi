// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { getApiBaseURL } from '../lib/apiBase.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // init
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    // Önce localStorage'dan userData'yı oku (role bilgisi burada)
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        // Token süresi kontrolü
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            const decoded = jwtDecode(storedToken);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
              // Token süresi dolmuş
              localStorage.removeItem('token');
              localStorage.removeItem('userData');
              return null;
            }
            // userData'yı kullan (role bilgisi burada)
            return userData;
          } catch {
            // Token decode edilemiyor, temizle
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            return null;
          }
        }
        return userData;
      } catch {
        // userData parse edilemiyor, temizle
        localStorage.removeItem('userData');
        return null;
      }
    }
    // Fallback: token'dan decode et (ama role bilgisi olmayabilir)
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          return null;
        }
        return decoded;
      } catch {
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });
  
  const isAuthenticated = !!user;

  // axios baseURL (Vite .env → VITE_API_URL) - her zaman güncelle
  useEffect(() => {
    const updateBaseURL = () => {
      const baseURL = getApiBaseURL();
      axios.defaults.baseURL = baseURL;
      if (import.meta.env.DEV) {
        console.log('🔧 AuthContext - dev proxy (baseURL boş, hedef vite.config proxy)');
      }
    };
    
    // İlk yüklemede ayarla
    updateBaseURL();
    
    // Interval'i kaldırdık - VITE_API_URL sabit olduğu için sürekli kontrol etmeye gerek yok

    // Axios interceptor: Her istekte baseURL'i kontrol et ve token'ı ekle
    axios.interceptors.request.use(
      (config) => {
        // Her istekte baseURL'i VITE_API_URL'den kontrol et
        const baseURL = getApiBaseURL();
        if (axios.defaults.baseURL !== baseURL) {
          axios.defaults.baseURL = baseURL;
        }
        
        // Token'ı ekle
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          config.headers['x-auth-token'] = token;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: 401 hatası alındığında logout yap
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          // setToken ve setUser closure içinde olmayabilir, bu yüzden sadece localStorage temizle
          // AuthContext'teki useEffect token değişikliğini algılayacak
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }, []);

  // Oturum açıkken rol ve policy sunucudan doğrulanır (localStorage tek başına yetki kaynağı değil)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get('/api/auth/me');
        const me = res.data;
        if (!cancelled && me && typeof me === 'object') {
          setUser((prev) => {
            const merged = { ...(prev || {}), ...me };
            localStorage.setItem('userData', JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // token geçersizse interceptor yönlendirir
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // apply token to axios (geriye dönük uyumluluk için)
  const applyToken = (t) => {
    if (t) {
      // Her iki header'ı da ekle
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      axios.defaults.headers.common['x-auth-token'] = t;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  // İlk yüklemede token'ı uygula ve kontrol et
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('userData');
    
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        // Token süresi kontrolü
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // Token süresi dolmuş
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          return;
        }
        applyToken(storedToken);
        
        // userData varsa onu kullan (role bilgisi burada)
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
          } catch {
            // userData parse edilemiyor, decoded kullan
            setUser(decoded);
          }
        } else {
          setUser(decoded);
        }
      } catch {
        // Token decode edilemiyor
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  // token değiştiğinde
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token); // { id, exp } - role bilgisi yok
        // Token süresi kontrolü
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // Token süresi dolmuş
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          applyToken(null);
          return;
        }
        
        // Token zaten localStorage'da varsa ve userData da varsa, state'i güncelleme
        // (login fonksiyonu zaten userData'yı set etti)
        const storedToken = localStorage.getItem('token');
        const storedUserData = localStorage.getItem('userData');
        
        if (storedToken === token && storedUserData) {
          // Token ve userData zaten localStorage'da, sadece token'ı axios'a uygula
          applyToken(token);
          // userData'yı parse et ve state'i güncelle (eğer henüz set edilmediyse)
          try {
            const userData = JSON.parse(storedUserData);
            // user state'i zaten doğru ise güncelleme
            if (!user || user.id !== userData.id) {
              setUser(userData);
            }
          } catch {
            // userData parse edilemiyor, decoded kullan
            if (!user || user.id !== decoded.id) {
              setUser(decoded);
            }
          }
        } else {
          // Token localStorage'a kaydedilmemiş veya userData yok
          localStorage.setItem('token', token);
          applyToken(token);
          
          // userData localStorage'da varsa onu kullan (role bilgisi burada)
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
            } catch {
              // userData parse edilemiyor, decoded kullan
              setUser(decoded);
            }
          } else {
            // userData yok, decoded kullan (ama role bilgisi olmayabilir)
            setUser(decoded);
          }
        }
      } catch {
        // Token decode edilemiyor
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        setToken(null);
        setUser(null);
        applyToken(null);
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      applyToken(null);
      setUser(null);
    }
  }, [token]);

  // Token geçerliliğini periyodik kontrol et (her 30 saniyede bir)
  useEffect(() => {
    const checkToken = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          // Token süresi kontrolü
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            // Token süresi dolmuş
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            setToken(null);
            setUser(null);
            applyToken(null);
          } else {
            // Token geçerli, userData'yı kontrol et
            const storedUserData = localStorage.getItem('userData');
            if (storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                if (!user || user.id !== userData.id) {
                  setUser(userData);
                }
              } catch {
                // userData parse edilemiyor, decoded kullan
                if (!user || user.id !== decoded.id) {
                  setUser(decoded);
                }
              }
            } else {
              // userData yok, decoded kullan
              if (!user || user.id !== decoded.id) {
                setUser(decoded);
              }
            }
          }
        } catch {
          // Token decode edilemiyor
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          applyToken(null);
        }
      } else {
        // Token yok
        if (user) {
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          applyToken(null);
        }
      }
    };

    // İlk kontrol
    checkToken();
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkToken, 30000);
    
    return () => clearInterval(interval);
  }, [user]); // user değiştiğinde tekrar kontrol et

  // 401 yakala → otomatik çıkış
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          // 401 hatası alındı, token geçersiz
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          applyToken(null);
          // Login sayfasına yönlendir (sadece admin sayfalarındaysa)
          if (window.location.pathname.startsWith('/admin') || 
              window.location.pathname.startsWith('/waiter') || 
              window.location.pathname.startsWith('/kitchen')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  const login = useCallback((tokenValue, userData = null) => {
    try {
      const decoded = jwtDecode(tokenValue); // { id, exp } - role bilgisi yok
      // Token süresi kontrolü
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token süresi dolmuş
        console.error('Token süresi dolmuş');
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        return;
      }
      
      // Önce eski verileri temizle (yeni kullanıcı girişi için)
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      
      // userData varsa onu kullan ve localStorage'a kaydet (role bilgisi burada)
      if (userData) {
        // Backend'den gelen userData'yı kullan (role bilgisi burada)
        setUser(userData);
        // Önce userData'yı localStorage'a kaydet (token set edilmeden önce)
        localStorage.setItem('userData', JSON.stringify(userData));
        // Sonra token'ı kaydet
        localStorage.setItem('token', tokenValue);
        // State'i güncelle
        setToken(tokenValue);
      } else {
        // Fallback: decoded token'dan al (ama role bilgisi olmayabilir)
        setUser(decoded);
        localStorage.setItem('token', tokenValue);
        setToken(tokenValue);
        localStorage.removeItem('userData');
      }
    } catch (err) {
      console.error('Token decode hatası:', err);
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-auth-token'];
  }, []);

  /** /api/auth/me ile kullanıcıyı güncelle (şifre politikası bayrağı dahil) */
  const refreshUserFromMe = async () => {
    const res = await axios.get('/api/auth/me');
    const me = res.data && typeof res.data === 'object' ? res.data : {};
    setUser((prev) => {
      const merged = { ...(prev || {}), ...me };
      localStorage.setItem('userData', JSON.stringify(merged));
      return merged;
    });
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const res = await axios.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, refreshUserFromMe, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}








