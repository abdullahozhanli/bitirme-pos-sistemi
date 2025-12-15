import Chip from '@mui/material/Chip';

export default function StatusChip({ status }) {
  const map = {
    'hazirlaniyor': { color: 'warning', label: 'Hazırlanıyor' },
    'serviste': { color: 'success', label: 'Serviste' },
    'tamamlandi': { color: 'info', label: 'Tamamlandı' },
    'iptal': { color: 'error', label: 'İptal' },
    // Eski değerler için geriye dönük uyumluluk
    'Hazırlanıyor': { color: 'warning', label: 'Hazırlanıyor' },
    'Hazır': { color: 'success', label: 'Hazır' },
    'Servis Edildi': { color: 'info', label: 'Servis Edildi' },
    'İptal Edildi': { color: 'error', label: 'İptal Edildi' }
  };
  const cfg = map[status] ?? { color: 'default', label: status };
  return <Chip size="small" variant="filled" color={cfg.color} label={cfg.label} />;
}


