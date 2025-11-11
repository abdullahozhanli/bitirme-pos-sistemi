// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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
          } catch (e) {
            // Token decode edilemiyor, temizle
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            return null;
          }
        }
        return userData;
      } catch (e) {
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
      } catch (e) {
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });
  
  const isAuthenticated = !!user;

  // axios baseURL (Vite .env → VITE_API_URL) - sadece bir kez ayarla
  useEffect(() => {
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
    axios.defaults.baseURL = baseURL;

    // Axios interceptor: Her istekte token'ı otomatik ekle
    axios.interceptors.request.use(
      (config) => {
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
          } catch (e) {
            // userData parse edilemiyor, decoded kullan
            setUser(decoded);
          }
        } else {
          setUser(decoded);
        }
      } catch (e) {
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
        localStorage.setItem('token', token);
        applyToken(token);
        
        // userData localStorage'da varsa onu kullan (role bilgisi burada)
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
          } catch (e) {
            // userData parse edilemiyor, decoded kullan
            setUser(decoded);
          }
        } else {
          // userData yok, decoded kullan (ama role bilgisi olmayabilir)
          setUser(decoded);
        }
      } catch (e) {
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
              } catch (e) {
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
        } catch (e) {
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

  const login = (tokenValue, userData = null) => {
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
      setToken(tokenValue);
      
      // userData varsa onu kullan ve localStorage'a kaydet (role bilgisi burada)
      if (userData) {
        // Backend'den gelen userData'yı kullan (role bilgisi burada)
        setUser(userData);
        // userData'yı localStorage'a kaydet (sayfa yenilendiğinde role bilgisi korunur)
        localStorage.setItem('userData', JSON.stringify(userData));
      } else {
        // Fallback: decoded token'dan al (ama role bilgisi olmayabilir)
        setUser(decoded);
        localStorage.removeItem('userData');
      }
    } catch (e) {
      console.error('Token decode hatası:', e);
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
    }
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
