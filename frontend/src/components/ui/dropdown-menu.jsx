import React, { useState, useRef, useEffect } from 'react';

/**
 * DropdownMenu component - shadcn/ui style dropdown menu.
 * @component
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Item 1</DropdownMenuItem>
 *     <DropdownMenuItem>Item 2</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child, { onClick: () => setOpen(!open), 'aria-expanded': open });
          }
          if (child.type === DropdownMenuContent) {
            return open ? React.cloneElement(child, { onClose: () => setOpen(false) }) : null;
          }
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuTrigger = ({ children, className = '', onClick, ...props }) => (
  <button
    onClick={onClick}
    className={['outline-none', className].join(' ')}
    {...props}
  >
    {children}
  </button>
);

export const DropdownMenuContent = ({ children, className = '', onClose: _onClose, ...props }) => (
  <div
    className={['absolute z-50 mt-1 min-w-[8rem] rounded-md border bg-white p-1 shadow-lg', className].join(' ')}
    {...props}
  >
    {children}
  </div>
);

export const DropdownMenuItem = ({ children, className = '', onClick, ...props }) => (
  <button
    onClick={onClick}
    className={['relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100', className].join(' ')}
    {...props}
  >
    {children}
  </button>
);

export default DropdownMenu;





















