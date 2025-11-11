import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

export default function ConfirmDialog({ open, title='Onayla', description, onClose, onConfirm, confirmText='Evet', cancelText='Vazgeç' }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>{description}</Typography>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose} variant="text">{cancelText}</Button>
        <Button onClick={onConfirm} color="primary" variant="contained">{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}

