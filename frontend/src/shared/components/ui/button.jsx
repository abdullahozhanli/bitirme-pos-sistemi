import React from 'react';

export const Button = ({ className = '', variant = 'default', size = 'default', ...props }) => {
  const variantClasses = {
    default: 'text-white bg-gray-900 hover:bg-gray-800',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  };
  const sizeClasses = {
    default: 'h-10 px-4 py-2 rounded-md',
    sm: 'h-8 px-3 rounded-md',
    icon: 'h-10 w-10 p-0 inline-flex items-center justify-center rounded-md',
  };
  return (
    <button
      {...props}
      className={['transition-all duration-200 font-medium', variantClasses[variant], sizeClasses[size], className].join(' ')}
    />
  );
};

export default Button;


