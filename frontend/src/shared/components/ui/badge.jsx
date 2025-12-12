import React from 'react';

export const Badge = ({ className = '', variant = 'default', ...props }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    secondary: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      {...props}
      className={['inline-flex items-center rounded-md text-xs font-medium px-2.5 py-0.5', variantClasses[variant], className].join(' ')}
    />
  );
};

export default Badge;

