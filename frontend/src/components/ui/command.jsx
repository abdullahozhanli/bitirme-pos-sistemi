import React, { useState, useRef, useEffect } from 'react';

/**
 * Command component - shadcn/ui style command palette.
 * @component
 * @example
 * <Command>
 *   <CommandInput placeholder="Search..." />
 *   <CommandList>
 *     <CommandItem>Item 1</CommandItem>
 *     <CommandItem>Item 2</CommandItem>
 *   </CommandList>
 * </Command>
 */
export const Command = ({ children, className = '', ...props }) => (
  <div
    className={['flex h-full w-full flex-col overflow-hidden rounded-md border bg-white', className].join(' ')}
    {...props}
  >
    {children}
  </div>
);

export const CommandInput = ({ placeholder = 'Search...', className = '', ...props }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex items-center border-b px-3">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={['flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50', className].join(' ')}
        {...props}
      />
    </div>
  );
};

export const CommandList = ({ children, className = '', ...props }) => (
  <div className={['max-h-[300px] overflow-y-auto overflow-x-hidden', className].join(' ')} {...props}>
    {children}
  </div>
);

export const CommandItem = ({ children, onSelect, className = '', ...props }) => (
  <div
    onClick={onSelect}
    className={['relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100', className].join(' ')}
    {...props}
  >
    {children}
  </div>
);

export const CommandDialog = ({ open, onOpenChange, children, ...props }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-white shadow-lg" {...props}>
        {children}
      </div>
    </div>
  );
};

export default Command;
















