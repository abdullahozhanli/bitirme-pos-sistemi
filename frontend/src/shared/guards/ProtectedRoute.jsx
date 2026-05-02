import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { jwtDecode } from 'jwt-decode';

/**
 * ProtectedRoute - Role-based route protection
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - İzin verilen roller (örn: ['admin', 'waiter'])
 * @param {React.ReactNode} props.children - Korunacak içerik
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  // Token kontrolü - sayfa değişiminde token'ı kontrol et
  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        // Token süresi kontrolü
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // Token süresi dolmuş
          localStorage.removeItem('token');
          setIsValid(false);
          setIsValidating(false);
          return;
        }
        
        // Token geçerli ve role kontrolü
        if (allowedRoles.length > 0 && (!decoded.role || !allowedRoles.includes(decoded.role))) {
          // Role uygun değil
          setIsValid(false);
          setIsValidating(false);
          return;
        }
        
        // Token geçerli
        setIsValid(true);
        setIsValidating(false);
      } catch (e) {
        // Token decode edilemiyor
        localStorage.removeItem('token');
        setIsValid(false);
        setIsValidating(false);
      }
    };

    // Kısa bir gecikme ile kontrol et (user state'inin yüklenmesi için)
    const timer = setTimeout(validateToken, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, allowedRoles]); // Sayfa değiştiğinde kontrol et

  // Yükleniyor durumu
  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        Yükleniyor...
      </div>
    );
  }

  // Token kontrolü
  const token = localStorage.getItem('token');
  if (!token || !isValid) {
    return <Navigate to="/login" replace />;
  }

  // User state kontrolü (opsiyonel - token geçerliyse user da olmalı)
  if (!user || !isAuthenticated) {
    // User state henüz yüklenmedi, token geçerliyse bekle
    if (isValid) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          Yükleniyor...
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // Role kontrolü
  if (allowedRoles.length > 0 && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" state={{ role: user.role || 'bilinmiyor' }} replace />;
  }

  return <>{children}</>;
}








