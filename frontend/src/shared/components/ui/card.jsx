import React from 'react';

export const Card = ({ className = '', ...props }) => (
  <div {...props} className={['bg-white rounded-lg border border-gray-200', className].join(' ')} />
);

export default Card;








