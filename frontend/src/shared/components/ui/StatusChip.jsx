import Chip from '@mui/material/Chip';

export default function StatusChip({ status }) {
  const map = {
    // Yeni standart durumlar
    'PAID': { color: 'success', label: 'Ödendi', bgColor: '#e8f5e9', textColor: '#059669', borderColor: '#c8e6c9' },
    'ödendi': { color: 'success', label: 'Ödendi', bgColor: '#e8f5e9', textColor: '#059669', borderColor: '#c8e6c9' },
    'tamamlandi': { color: 'success', label: 'Tamamlandı', bgColor: '#e8f5e9', textColor: '#059669', borderColor: '#c8e6c9' },
    'Pending': { color: 'warning', label: 'Beklemede', bgColor: '#fffbeb', textColor: '#d97706', borderColor: '#fde68a' },
    'CREATED': { color: 'warning', label: 'Beklemede', bgColor: '#fffbeb', textColor: '#d97706', borderColor: '#fde68a' },
    'Cancelled': { color: 'error', label: 'İptal', bgColor: '#fef2f2', textColor: '#dc2626', borderColor: '#fecaca' },
    'iptal': { color: 'error', label: 'İptal', bgColor: '#fef2f2', textColor: '#dc2626', borderColor: '#fecaca' },
    'CANCELED': { color: 'error', label: 'İptal', bgColor: '#fef2f2', textColor: '#dc2626', borderColor: '#fecaca' },
    'Preparing': { color: 'info', label: 'Hazırlanıyor', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'hazirlaniyor': { color: 'info', label: 'Hazırlanıyor', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'IN_PREP': { color: 'info', label: 'Hazırlanıyor', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'SENT_TO_KITCHEN': { color: 'info', label: 'Hazırlanıyor', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'serviste': { color: 'info', label: 'Serviste', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'READY': { color: 'info', label: 'Hazır', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    // Eski değerler için geriye dönük uyumluluk
    'Hazırlanıyor': { color: 'info', label: 'Hazırlanıyor', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'Hazır': { color: 'info', label: 'Hazır', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'Servis Edildi': { color: 'info', label: 'Servis Edildi', bgColor: '#eff6ff', textColor: '#2563eb', borderColor: '#dbeafe' },
    'İptal Edildi': { color: 'error', label: 'İptal', bgColor: '#fef2f2', textColor: '#dc2626', borderColor: '#fecaca' }
  };
  const cfg = map[status] ?? { color: 'default', label: status, bgColor: '#f9fafb', textColor: '#6b7280', borderColor: '#e5e7eb' };
  
  return (
    <Chip 
      size="small" 
      variant="outlined"
      label={cfg.label}
      sx={{
        backgroundColor: cfg.bgColor || '#f9fafb',
        color: cfg.textColor || '#6b7280',
        borderColor: cfg.borderColor || '#e5e7eb',
        fontWeight: 500,
        fontSize: '0.8125rem',
        height: '24px',
        borderRadius: 'var(--radius-pill)',
        '& .MuiChip-label': {
          padding: '0 8px',
        }
      }}
    />
  );
}








