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
import { Card, CardContent, Stack, Typography, Chip, Skeleton, Button, Alert, useMediaQuery, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { COLORS } from '../constants/colors.js';

export type Delta = { trend: 'up' | 'down'; value: string };

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: Delta;
  icon?: React.ReactNode;
  iconBgColor?: string;
  hint?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export default function KpiCard({ label, value, delta, icon, iconBgColor, hint, loading, error, onRetry }: KpiCardProps) {
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
    <Card sx={{ 
      height: '100%', 
      borderRadius: 2, 
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      position: 'relative',
      overflow: 'hidden',
      border: 'none',
      backgroundColor: '#FFFFFF',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        transform: 'translateY(-1px)'
      }
    }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: 'relative' }}>
        {isMdUp ? (
          <Stack spacing={1.25}>
            {/* Header: Label ve Icon */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5, pr: delta ? 7 : 0 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '13px',
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  flex: 1,
                  lineHeight: 1.4,
                  letterSpacing: '0.01em'
                }}
              >
                {label}
              </Typography>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: iconBgColor || 'rgba(0, 0, 0, 0.04)',
                color: iconBgColor ? '#fff' : 'inherit',
                position: 'relative',
                zIndex: 0,
                ml: 1
              }}>
                {icon}
              </Box>
            </Stack>
            
            {/* Value */}
            <Typography 
              sx={{ 
                fontSize: { xs: '22px', md: '28px' }, 
                fontWeight: 700,
                color: COLORS.textPrimary,
                lineHeight: 1.2,
                mb: 0.25,
                letterSpacing: '-0.02em'
              }}
            >
              {value}
            </Typography>
            
            {/* Hint */}
            {hint && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '12px', 
                  color: COLORS.textTertiary,
                  lineHeight: 1.4,
                  fontWeight: 400
                }}
              >
                {hint}
              </Typography>
            )}
            
            {/* Trend Indicator - Sağ üstte, renkli daire içinde */}
            {delta && (
              <Box sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 0.25,
                minWidth: 56,
                height: 22,
                borderRadius: '11px',
                padding: '0 6px',
                backgroundColor: delta.trend === 'down' ? COLORS.error : COLORS.success,
                color: '#fff',
                fontWeight: 700,
                fontSize: '11px',
                zIndex: 2
              }}>
                {delta.trend === 'down' ? (
                  <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                ) : (
                  <ArrowUpwardIcon sx={{ fontSize: 12 }} />
                )}
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', lineHeight: 1, color: '#fff' }}>
                  {delta.value}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <Typography sx={{ 
              fontSize: '22px', 
              fontWeight: 700,
              color: COLORS.textPrimary,
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              {value}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS.textSecondary,
                lineHeight: 1.4
              }}
            >
              {label}
            </Typography>
            {hint && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '12px',
                  color: COLORS.textTertiary,
                  lineHeight: 1.4,
                  fontWeight: 400
                }}
              >
                {hint}
              </Typography>
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


