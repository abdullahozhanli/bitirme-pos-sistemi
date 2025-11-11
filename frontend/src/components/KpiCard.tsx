/**
 * Reusable KPI Card component for displaying key performance indicators.
 * Supports loading, error, and delta (trend) states with responsive layout.
 *
 * @component
 * @example
 * // Basic usage
 * <KpiCard label="Toplam Sipariş" value="23 Adet" />
 *
 * @example
 * // With trend delta and icon
 * <KpiCard
 *   label="Toplam Ciro"
 *   value="₺12,450"
 *   delta={{ trend: 'up', value: '+8%' }}
 *   icon={<TrendingUpIcon />}
 *   hint="Dünden"
 * />
 *
 * @example
 * // Loading state
 * <KpiCard label="Yükleniyor..." loading={true} />
 *
 * @example
 * // Error state
 * <KpiCard
 *   label="Hata"
 *   error="Veriler yüklenemedi"
 *   onRetry={() => refetch()}
 * />
 *
 * @param {object} props - Component props.
 * @param {string} props.label - The label/title of the KPI (e.g., "Toplam Sipariş").
 * @param {string} props.value - The main value of the KPI (e.g., "23 Adet" or "₺12,450").
 * @param {{trend: 'up'|'down'; value: string}} [props.delta] - Optional delta (change) value with trend direction.
 *   - `trend`: 'up' for positive change, 'down' for negative change.
 *   - `value`: The delta value as a string (e.g., "+8%", "-5%").
 * @param {React.ReactNode} [props.icon] - Optional icon to display (typically placed in the top-right corner).
 * @param {string} [props.hint] - Optional hint text shown below the value (e.g., "Dünden", "Bu hafta").
 * @param {boolean} [props.loading=false] - If true, shows a skeleton loader instead of content.
 * @param {string} [props.error] - If provided, shows an error message and a retry button instead of the KPI content.
 * @param {() => void} [props.onRetry] - Callback function for the retry button in error state.
 *
 * @returns {React.ReactElement} The KPI card component with responsive layout.
 */
import React from 'react';
import { Card, CardContent, Stack, Typography, Chip, Skeleton, Button, Alert, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export type Delta = { trend: 'up' | 'down'; value: string };

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: Delta;
  icon?: React.ReactNode;
  hint?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export default function KpiCard({ label, value, delta, icon, hint, loading, error, onRetry }: KpiCardProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  if (error) {
    return (
      <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Alert severity="error" variant="outlined">{error}</Alert>
            <Button variant="contained" color="error" onClick={onRetry}>Tekrar dene</Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={160} height={28} />
            <Skeleton variant="text" width={100} height={14} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {isMdUp ? (
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.75rem' }, fontWeight: 700 }}>
                {value}
              </Typography>
              {hint && (
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
              )}
            </Stack>
            <Stack alignItems="flex-end" spacing={1}>
              {icon}
              {delta && (
                <Chip
                  size="small"
                  color={delta.trend === 'down' ? 'error' : 'success'}
                  icon={delta.trend === 'down' ? <ArrowDownwardIcon fontSize="small" aria-label="trend-down" /> : <ArrowUpwardIcon fontSize="small" aria-label="trend-up" />}
                  label={delta.value}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: 'clamp(18px, 6vw, 28px)', fontWeight: 700 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">{hint}</Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
              {icon}
              {delta && (
                <Chip
                  size="small"
                  color={delta.trend === 'down' ? 'error' : 'success'}
                  icon={delta.trend === 'down' ? <ArrowDownwardIcon fontSize="small" aria-label="trend-down" /> : <ArrowUpwardIcon fontSize="small" aria-label="trend-up" />}
                  label={delta.value}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}


