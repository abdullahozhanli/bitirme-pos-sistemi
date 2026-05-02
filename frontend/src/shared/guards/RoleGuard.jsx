import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * RoleGuard - Role-based route protection component
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - İzin verilen roller (örn: ['admin', 'garson'])
 * @param {React.ReactNode} props.children - Korunacak içerik
 * @param {string} props.redirectTo - Yetkisiz erişimde yönlendirilecek sayfa (varsayılan: '/')
 */
export default function RoleGuard({ allowedRoles = [], children, redirectTo = '/' }) {
  const { user, isAuthenticated } = useAuth();

  // Debug: user ve role bilgisini logla
  console.log('🔍 RoleGuard check:', {
    isAuthenticated,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    allowedRoles,
    hasAccess: user && user.role ? allowedRoles.includes(user.role) : false
  });

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role kontrolü
  const userRole = user.role;
  
  if (!userRole) {
    // Role bilgisi yok, ana sayfaya yönlendir
    console.warn('⚠️ RoleGuard: user.role yok!', user);
    return <Navigate to={redirectTo} replace />;
  }

  // İzin verilen roller listesinde kullanıcının rolü var mı?
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasAccess) {
    // Yetkisiz erişim - kullanıcıyı kendi paneline veya ana sayfaya yönlendir
    // Role'e göre uygun panele yönlendir
    let defaultRedirect = redirectTo;
    
    if (userRole === 'superadmin') {
      defaultRedirect = '/superadmin';
    } else if (userRole === 'admin') {
      defaultRedirect = '/admin';
    } else if (userRole === 'garson' || userRole === 'yetkili') {
      defaultRedirect = '/waiter';
    } else if (userRole === 'mutfak') {
      defaultRedirect = '/kitchen';
    } else if (userRole === 'kasa') {
      defaultRedirect = '/cashier';
    } else {
      defaultRedirect = '/';
    }

    return <Navigate to={defaultRedirect} replace />;
  }

  // Yetki var, içeriği göster
  return <>{children}</>;
}








