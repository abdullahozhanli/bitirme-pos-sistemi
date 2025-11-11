/**
 * Reusable component for displaying an empty state.
 * Shows an informational banner when no data is available, with optional action button.
 *
 * @component
 * @example
 * // Basic usage
 * <EmptyState title="Veri bulunamadı" />
 *
 * @example
 * // With description and action
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="Sipariş bulunamadı"
 *   description="Henüz hiç sipariş oluşturulmamış."
 *   actionLabel="Yenile"
 *   onAction={() => refetch()}
 * />
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} [props.icon] - Optional icon to display (typically an icon component).
 * @param {string} props.title - The main title for the empty state (required).
 * @param {string} [props.description] - Optional descriptive text shown below the title.
 * @param {string} [props.actionLabel] - Text for the optional action button.
 * @param {() => void} [props.onAction] - Callback function for the action button click.
 *
 * @returns {React.ReactElement} The empty state banner component.
 */
import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          {icon}
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">{description}</Typography>
            )}
          </Box>
        </Stack>
        {actionLabel && (
          <Button variant="outlined" onClick={onAction}>{actionLabel}</Button>
        )}
      </Stack>
    </Box>
  );
}


