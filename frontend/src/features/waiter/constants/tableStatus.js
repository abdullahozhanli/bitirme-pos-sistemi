// Masa Durum Enum'ları
export const TABLE_STATUS = {
  AVAILABLE: 'bos',
  OCCUPIED: 'dolu',
  RESERVED: 'rezerve',
  PAYMENT_PENDING: 'odeme_bekliyor',
};

// Durum Etiketleri
export const STATUS_LABELS = {
  [TABLE_STATUS.AVAILABLE]: 'MÜSAİT',
  [TABLE_STATUS.OCCUPIED]: 'DOLU',
  [TABLE_STATUS.RESERVED]: 'REZERVE',
  [TABLE_STATUS.PAYMENT_PENDING]: 'ÖDEME BEKLİYOR',
};

// Durum Renkleri - Tek yerden yönetim
export const STATUS_COLORS = {
  [TABLE_STATUS.AVAILABLE]: {
    border: '#10B981', // Yeşil
    background: '#ECFDF5',
    text: '#059669',
    dot: '#10B981',
  },
  [TABLE_STATUS.OCCUPIED]: {
    border: '#EF4444', // Kırmızı
    background: '#FEF2F2',
    text: '#DC2626',
    dot: '#EF4444',
  },
  [TABLE_STATUS.RESERVED]: {
    border: '#F59E0B', // Turuncu
    background: '#FFFBEB',
    text: '#D97706',
    dot: '#F59E0B',
  },
  [TABLE_STATUS.PAYMENT_PENDING]: {
    border: '#3B82F6', // Mavi
    background: '#EFF6FF',
    text: '#2563EB',
    dot: '#3B82F6',
  },
};

// Durum CSS Class Mapping
export const STATUS_CLASS_MAP = {
  [TABLE_STATUS.AVAILABLE]: 'available',
  [TABLE_STATUS.OCCUPIED]: 'full',
  [TABLE_STATUS.RESERVED]: 'reserved',
  [TABLE_STATUS.PAYMENT_PENDING]: 'payment_pending',
};
