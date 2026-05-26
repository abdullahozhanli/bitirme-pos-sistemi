import { Chip } from '@mui/material';
import { getOrderPaymentDisplayText, isOrderPaid } from '../../utils/orderPayment';

/** Mobil siparişin ödeme bilgisi (web'de seçim yok — sadece gösterim). */
export default function PaymentBadge({ order, size = 'small' }) {
  if (!order) return null;

  const label = getOrderPaymentDisplayText(order);
  const paid = isOrderPaid(order);

  return (
    <Chip
      size={size}
      label={label}
      color={paid ? 'success' : 'warning'}
      variant={paid ? 'filled' : 'outlined'}
    />
  );
}
