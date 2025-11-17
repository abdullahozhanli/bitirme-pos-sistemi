import React, { forwardRef } from 'react';

/**
 * Textarea component - shadcn/ui style textarea.
 * @component
 * @example
 * <Textarea placeholder="Enter text..." />
 */
export const Textarea = forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    {...props}
    className={['flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50', className].join(' ')}
  />
));

Textarea.displayName = 'Textarea';

export default Textarea;
















