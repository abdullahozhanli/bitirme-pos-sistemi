import React, { useState, useRef, useEffect } from 'react';

/**
 * Select component - shadcn/ui style select dropdown.
 * @component
 * @example
 * <Select value={value} onValueChange={setValue}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select an option" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *     <SelectItem value="2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 */
export const Select = ({ children, value, onValueChange, ...props }) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={selectRef} className="relative" {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, {
              onClick: () => setOpen(!open),
              'aria-expanded': open,
              value,
            });
          }
          if (child.type === SelectContent) {
            return open
              ? React.cloneElement(child, {
                  onClose: () => setOpen(false),
                  onValueChange: (val) => {
                    onValueChange?.(val);
                    setOpen(false);
                  },
                })
              : null;
          }
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = React.forwardRef(({ children, className = '', onClick, value, ...props }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={['flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50', className].join(' ')}
    {...props}
  >
    {children || <span className="text-gray-500">Select...</span>}
  </button>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = ({ placeholder, value, children }) => (
  <span className="block truncate">{children || value || placeholder || 'Select...'}</span>
);

export const SelectContent = ({ children, className = '', onClose, onValueChange, ...props }) => (
  <div
    className={['absolute z-50 mt-1 max-h-[300px] w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg', className].join(' ')}
    {...props}
  >
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === SelectItem) {
        return React.cloneElement(child, {
          onClick: () => onValueChange?.(child.props.value),
        });
      }
      return child;
    })}
  </div>
);

export const SelectItem = ({ children, value, className = '', onClick, ...props }) => (
  <button
    onClick={onClick}
    className={['relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100', className].join(' ')}
    {...props}
  >
    {children}
  </button>
);

export default Select;








