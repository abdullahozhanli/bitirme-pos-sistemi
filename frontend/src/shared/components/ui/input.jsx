import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={['w-full h-10 px-3 rounded-md border outline-none border-gray-300 focus:ring-2 focus:ring-offset-0', className].join(' ')}
  />
));

Input.displayName = 'Input';

export default Input;








