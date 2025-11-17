import React from 'react';
import { Dialog as MuiDialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

/**
 * Dialog component - shadcn/ui style dialog wrapper using MUI.
 * @component
 * @example
 * <Dialog open={open} onClose={() => setOpen(false)}>
 *   <DialogTitle>Title</DialogTitle>
 *   <DialogContent>Content here</DialogContent>
 *   <DialogActions>
 *     <Button onClick={() => setOpen(false)}>Close</Button>
 *   </DialogActions>
 * </Dialog>
 */
export const Dialog = ({ open, onClose, children, className = '', ...props }) => (
  <MuiDialog open={open} onClose={onClose} {...props} className={className}>
    {children}
  </MuiDialog>
);

export { DialogTitle, DialogContent, DialogActions };

export default Dialog;
















