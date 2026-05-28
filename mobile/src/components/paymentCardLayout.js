/**
 * Kart görseli üzerine yazı bindirme — selfkasa_ön / selfkasa_arka
 * Konumlar 1448×1086 görsellere göre ayarlandı (sadece değer alanları).
 */

export const USE_CARD_IMAGE_TEMPLATE = true;

export const CARD_IMAGE = {
  front: require('../görsel/odeme/selfkasa_ön.png'),
  back: require('../görsel/odeme/selfkasa_arka.png'),
};

export const CARD_ASPECT = 1448 / 1086;
export const CARD_MAX_WIDTH = 360;
export const CARD_HEIGHT = Math.round(CARD_MAX_WIDTH / CARD_ASPECT);

/** Yüzde konumlar — görseldeki AD SOYAD / 05/28 / CVV kutusu hizası */
export const CARD_FIELD_LAYOUT = {
  front: {
    number: {
      left: '11%',
      top: '47%',
      width: '78%',
      fontSize: 17,
      letterSpacing: 2.4,
      textAlign: 'center',
    },
    holder: {
      left: '14%',
      top: '75.5%',
      width: '40%',
      fontSize: 14,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    expiry: {
      left: '58%',
      top: '75.5%',
      width: '28%',
      fontSize: 14,
      letterSpacing: 0.5,
      textAlign: 'right',
    },
  },
  back: {
    cvv: {
      left: '57%',
      top: '36.5%',
      width: '18%',
      fontSize: 16,
      letterSpacing: 2,
      textAlign: 'center',
    },
  },
};
