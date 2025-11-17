import React from 'react';
import { Modal, Box, IconButton, Divider, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 520,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 3,
};

const pill = {
  px: 2.4,
  py: 1.2,
  borderRadius: 10000,
  border: '1px solid #D0D5DD',
  background: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 120ms ease, border-color 120ms ease',
};

export default function OrderDetailModal({
  open,
  onClose,
  order,
  onMakeReady,
  onMarkPaid,
  onCancelOrder,
}) {
  if (!order) return null;

  const normalizeTr = (text) => String(text || '')
    .replace(/İ/g, 'I').replace(/I/g, 'I')
    .replace(/ı/g, 'i').replace(/i/g, 'i')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .toLowerCase();

  const statusNorm = normalizeTr(order.status);
  const isCancelled = statusNorm === 'iptal' || order.status === 'CANCELED';
  const isPreparing = statusNorm === 'hazirlaniyor' || order.status === 'CREATED' || order.status === 'IN_PREP';
  const isPaid = statusNorm === 'tamamlandi' || order.status === 'PAID';

  const disabledPaid = isPaid || isCancelled;
  const disabledReady = !isPreparing;
  const disabledCancel = isCancelled;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <h2 style={{ margin: 0 }}>Sipariş Detayı</h2>
          <IconButton aria-label="kapat" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <div style={{ lineHeight: 1.6, fontSize: 16 }}>
          <div><strong>Masa:</strong> {order.table?.name || '—'}</div>
          <div><strong>Durum:</strong> {order.status}</div>
          <div><strong>Toplam:</strong> {Number(order.total || 0).toFixed(2)} TL</div>
        </div>

        <Divider sx={{ my: 2 }} />

        <div>
          <strong>Ürünler:</strong>
          <ul style={{ marginTop: 8 }}>
            {order.items?.map((it, i) => (
              <li key={i}>
                {it.qty} x {it.name} ({Number(it.price).toFixed(2)} TL)
                {it.note && <span style={{ color: '#666', fontSize: '0.9em' }}> - {it.note}</span>}
              </li>
            ))}
          </ul>
          {order.notes && (
            <div style={{ marginTop: 8 }}>
              <strong>Not:</strong> {order.notes}
            </div>
          )}
        </div>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', pt: 2 }}>
          <Button
            variant="outlined"
            disabled={disabledReady}
            onClick={() => { console.debug('onMakeReady click'); onMakeReady?.(order._id || order.id); }}
            sx={{ textTransform:'none', borderColor:'#D0D5DD', color:'#111827', '&:hover':{ bgcolor:'rgba(0,0,0,0.04)', borderColor:'#D0D5DD' }, cursor: disabledReady ? 'not-allowed' : 'pointer' }}
          >
            Hazır Yap
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={disabledPaid}
            onClick={() => { 
              console.log('🔍 Ödendi Yap butonu tıklandı');
              console.log('🔍 Order:', order);
              console.log('🔍 Order ID:', order._id || order.id);
              console.log('🔍 disabledPaid:', disabledPaid);
              console.log('🔍 onMarkPaid fonksiyonu:', onMarkPaid);
              if (onMarkPaid) {
                const orderId = order._id || order.id;
                console.log('📞 onMarkPaid çağrılıyor, orderId:', orderId);
                onMarkPaid(orderId);
              } else {
                console.error('❌ onMarkPaid fonksiyonu tanımlı değil!');
              }
            }}
            sx={{ textTransform:'none', cursor: disabledPaid ? 'not-allowed' : 'pointer' }}
          >
            Ödendi Yap
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={disabledCancel}
            onClick={() => { console.debug('onCancelOrder click'); onCancelOrder?.(order._id || order.id); }}
            sx={{ textTransform:'none', cursor: disabledCancel ? 'not-allowed' : 'pointer' }}
          >
            İptal Et
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}


