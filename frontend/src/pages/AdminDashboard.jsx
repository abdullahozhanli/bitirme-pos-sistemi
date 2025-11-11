import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PageHeader from '../components/PageHeader.jsx';
import KpiCard from '../components/KpiCard.tsx';
import { useQuery } from '@tanstack/react-query';
import { getKpis } from '../lib/api/dashboard.ts';
import EmptyState from '../components/state/EmptyState.tsx';
import ErrorState from '../components/state/ErrorState.tsx';
import ViewportProbe from '../components/dev/ViewportProbe.tsx';

// İstatistik kartı
function StatCard({ title, value, unit, icon, subtitle, trend, trendDirection, accentColor }) {
  return (
    <Card sx={{ boxShadow: 3, height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: (theme)=>accentColor ? theme.palette[accentColor]?.main : 'primary.main', color: '#fff', flexShrink: 0 }}>
              {icon}
            </Box>
            <Typography sx={{ fontSize: 'clamp(10px, 1.3vw, 13px)' }} color="text.secondary">
          {title}
        </Typography>
          </Box>
        </Box>
        <Typography variant="h5" component="div" sx={{ fontSize: 'clamp(16px, 2.1vw, 22px)', color: 'text.primary', fontWeight: 700, mt: 0.25 }}>
          {value} {unit}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 'clamp(10px, 1.3vw, 12px)' }}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: trendDirection === 'down' ? 'error.main' : 'success.main', fontSize: '0.9rem' }}>
            {trendDirection === 'down' ? <ArrowDownwardIcon sx={{ fontSize: 16 }} /> : <ArrowUpwardIcon sx={{ fontSize: 16 }} />}
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{trend}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verileri çek
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); 
      setError('');
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userData');
        
        // Debug: Token ve userData'yı logla
        console.log('🔍 AdminDashboard fetchData:', {
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 20)}...` : null,
          userData: userData ? JSON.parse(userData) : null
        });
        
        const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
        
        const [summaryRes, ordersRes] = await Promise.all([
          axios.get('/api/admin/stats/today', { headers }),
          axios.get('/api/admin/orders?limit=100', { headers }),
        ]);

        setSummary(summaryRes.data);
        const ordersList = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
        setOrders(ordersList);
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi:', err);
        setError(err.response?.data?.message || err.message || 'Veriler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); 

  // KPIs via React Query (mock)
  const { data: kpis, isLoading: kpisLoading, isError: kpisError, refetch: refetchKpis, error: kpisErrObj } = useQuery({
    queryKey: ['kpis'],
    queryFn: getKpis,
  });

  const nf = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const isZeroData = !!kpis && (kpis.revenue === 0 && kpis.orders === 0 && kpis.pending === 0 && kpis.canceled === 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }


  return (
    <Box
      className="container"
      sx={{
        flexGrow: 1,
        maxWidth: '100%',
        mx: 'auto',
        px: { xs: 'clamp(12px, 4vw, 24px)', sm: 'clamp(12px, 4vw, 24px)', md: 'clamp(12px, 4vw, 24px)' },
        py: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 },
        minW: 0,
        overflowX: 'hidden',
      }}
    >
      <PageHeader title="Kontrol Paneli" subtitle="Bugünün özeti" />

      {/* İstatistik Kartları */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: { xs: 2, sm: 3 },
          minW: 0,
          overflowX: 'hidden',
        }}
      >
        <Box role="status" aria-live="polite" sx={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
          {kpisLoading ? 'KPI verileri yükleniyor' : kpisError ? 'KPI verileri alınamadı' : 'KPI verileri yüklendi'}
        </Box>
        <Box
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            minW: 0,
          }}
        >
        <KpiCard
          label="Toplam Ciro (Ödenenler)"
          value={`${nf.format(kpis?.revenue ?? 0)} TL`}
          hint="dünden"
          delta={{ trend: 'up', value: '+12.5%' }}
          icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
          loading={kpisLoading}
          error={kpisError ? (kpisErrObj?.message || 'Hata') : undefined}
          onRetry={() => refetchKpis()}
        />
        <KpiCard
          label="Toplam Sipariş"
          value={`${nf.format(kpis?.orders ?? 0)} Adet`}
          hint="bu hafta"
          delta={{ trend: 'up', value: '+8.2%' }}
          icon={<ShoppingCartIcon sx={{ color: 'text.primary' }} />}
          loading={kpisLoading}
          error={kpisError ? (kpisErrObj?.message || 'Hata') : undefined}
          onRetry={() => refetchKpis()}
        />
        <KpiCard
          label="Bekleyen Sipariş"
          value={`${nf.format(kpis?.pending ?? 0)} Adet`}
          hint="aktif"
          icon={<AccessTimeIcon sx={{ color: 'warning.main' }} />}
          loading={kpisLoading}
          error={kpisError ? (kpisErrObj?.message || 'Hata') : undefined}
          onRetry={() => refetchKpis()}
        />
        <KpiCard
          label="İptal Edilen"
          value={`${nf.format(kpis?.canceled ?? 0)} Adet`}
          hint="dünden"
          delta={{ trend: 'down', value: '-2.1%' }}
          icon={<PersonIcon sx={{ color: 'error.main' }} />}
          loading={kpisLoading}
          error={kpisError ? (kpisErrObj?.message || 'Hata') : undefined}
          onRetry={() => refetchKpis()}
              />
            </Box>
          </Box>

      {!kpisLoading && !kpisError && isZeroData && (
        <EmptyState title="Veri bulunamadı" description="KPI verileri şu anda boş görünüyor." actionLabel="Yenile" onAction={() => refetchKpis()} />
      )}
      {kpisError && (
        <Box sx={{ mt: 2 }}>
          <ErrorState message={kpisErrObj?.message || 'KPI verileri alınamadı'} onRetry={() => refetchKpis()} />
        </Box>
      )}

      {/* Dev-only ViewportProbe for QA */}
      {import.meta.env.DEV && <ViewportProbe />}
    </Box>
  );
}
