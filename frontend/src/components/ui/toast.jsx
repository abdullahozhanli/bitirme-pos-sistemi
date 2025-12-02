import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

/**
 * Toast component - shadcn/ui style toast notifications using MUI.
 * @component
 * @example
 * const { toast } = useToast();
 * toast({ title: 'Success', description: 'Operation completed' });
 */
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'success', duration = 3000 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description, variant, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open={true}
          autoHideDuration={t.duration}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={t.variant === 'error' ? 'error' : t.variant === 'warning' ? 'warning' : 'success'}>
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};

export const Toast = ({ title, description, variant = 'success', open, onClose }) => (
  <Snackbar open={open} autoHideDuration={3000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
    <Alert severity={variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'success'}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm">{description}</div>}
    </Alert>
  </Snackbar>
);

export default Toast;





















