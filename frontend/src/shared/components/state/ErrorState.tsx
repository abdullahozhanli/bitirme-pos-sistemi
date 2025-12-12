/**
 * ErrorState — generic error banner with retry
 * Usage: <ErrorState message="Yüklenemedi" onRetry={refetch} />
 */
import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

export interface ErrorStateProps {
  icon?: React.ReactNode;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export default function ErrorState({ icon, message, retryLabel = 'Tekrar dene', onRetry }: ErrorStateProps) {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'error.main', bgcolor: 'error.light' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          {icon}
          <Typography color="error.main" fontWeight={700}>{message}</Typography>
        </Stack>
        <Button variant="contained" color="error" onClick={onRetry}>{retryLabel}</Button>
      </Stack>
    </Box>
  );
}

