/**
 * Reusable Page Header component for Admin Panel.
 * Displays a title and optional subtitle.
 *
 * @component
 * @example
 * // Basic usage
 * <PageHeader title="Kontrol Paneli" subtitle="Bugünün özeti" />
 * 
 * // With action button
 * <PageHeader 
 *   title="Şube Yönetimi" 
 *   subtitle="Sistemdeki tüm şubeleri yönetin"
 *   action={<Button>Yeni Şube</Button>}
 * />
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Main title of the page (required).
 * @param {string} [props.subtitle] - Optional subtitle text shown below the title.
 * @param {React.ReactNode} [props.action] - Optional action button/element to display on the right.
 *
 * @returns {React.ReactElement} The page header component.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { COLORS } from '../constants/colors.js';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography 
          variant="h5" 
          fontWeight={700} 
          sx={{ 
            fontSize: '28px',
            color: COLORS.textPrimary,
            mb: subtitle ? 0.5 : 0,
            lineHeight: 1.3,
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontSize: '15px',
              fontWeight: 400,
              color: COLORS.textSecondary,
              lineHeight: 1.4
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ ml: 2 }}>
          {action}
        </Box>
      )}
    </Box>
  );
}
