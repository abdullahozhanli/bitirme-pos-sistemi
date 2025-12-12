import React, { useEffect } from 'react';

export const Sheet = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  return (
    <div aria-hidden={!open} style={{ display: open ? 'block' : 'none' }}>
      {children}
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} aria-hidden />
    </div>
  );
};

export const SheetContent = ({ className = '', children, ...props }) => (
  <div
    role="dialog"
    aria-modal="true"
    {...props}
    className={['fixed right-0 top-0 h-full bg-white shadow-xl w-full sm:max-w-md p-6 z-50', className].join(' ')}
  >
    {children}
  </div>
);

export const SheetHeader = ({ className = '', ...props }) => (
  <div {...props} className={['mb-4', className].join(' ')} />
);

export const SheetTitle = ({ className = '', ...props }) => (
  <h2 {...props} className={['text-xl font-semibold', className].join(' ')} />
);

export default Sheet;

