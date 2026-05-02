import React from 'react';
import { Drawer as MuiDrawer, Typography } from '@mui/material';

/**
 * Drawer component - shadcn/ui style drawer wrapper using MUI.
 * @component
 * @example
 * <Drawer open={open} onClose={() => setOpen(false)} anchor="right">
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Title</DrawerTitle>
 *     </DrawerHeader>
 *     Content here
 *   </DrawerContent>
 * </Drawer>
 */
export const Drawer = ({ open, onOpenChange, children, anchor = 'right', className = '', PaperProps, ...props }) => (
  <MuiDrawer
    anchor={anchor}
    open={open}
    onClose={() => onOpenChange?.(false)}
    PaperProps={{
      ...PaperProps,
      sx: {
        width: { xs: '100%', sm: '400px' },
        maxWidth: '100vw',
        ...PaperProps?.sx,
      },
    }}
    {...props}
    className={className}
  >
    {children}
  </MuiDrawer>
);

export const DrawerContent = ({ children, className = '', ...props }) => (
  <div className={`p-4 space-y-4 ${className}`} {...props}>
    {children}
  </div>
);

export const DrawerHeader = ({ children, className = '', ...props }) => (
  <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const DrawerTitle = ({ children, className = '', ...props }) => (
  <Typography variant="h6" className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
    {children}
  </Typography>
);

export const DrawerFooter = ({ children, className = '', ...props }) => (
  <div className={`flex justify-end gap-2 pt-4 border-t border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

export default Drawer;








