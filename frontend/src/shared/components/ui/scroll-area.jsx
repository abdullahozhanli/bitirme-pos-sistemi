import React from 'react';

export const ScrollArea = ({ className = '', style, ...props }) => (
  <div {...props} className={['relative overflow-x-auto', className].join(' ')} style={{ ...style }} />
);

export default ScrollArea;

