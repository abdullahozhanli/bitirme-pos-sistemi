/**
 * Reusable Page Header component for Admin Panel.
 * Displays a title and optional subtitle.
 *
 * @component
 * @example
 * // Basic usage
 * <PageHeader title="Kontrol Paneli" subtitle="Bugünün özeti" />
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Main title of the page (required).
 * @param {string} [props.subtitle] - Optional subtitle text shown below the title.
 *
 * @returns {React.ReactElement} The page header component.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ fontSize: 'clamp(18px, 2.2vw, 24px)' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 'clamp(12px, 1.6vw, 14px)' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
