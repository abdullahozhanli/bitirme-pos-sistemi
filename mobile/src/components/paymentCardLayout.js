/**
 * Kart görseli üzerine yazı bindirme — kırpılmış (beyaz kenarsız) kart görselleri.
 * Görseller kartın kenarına kırpıldı: ön 1275×812 (oran 1.5702), arka 1276×821.
 * Konumlar kırpılmış görsele göre hesaplandı (kart artık zemine beyazsız oturuyor).
 */

export const USE_CARD_IMAGE_TEMPLATE = true;

export const CARD_IMAGE = {
  front: require('../görsel/odeme/selfkasa_ön_kart.png'),
  back: require('../görsel/odeme/selfkasa_arka_kart.png'),
};

export const CARD_ASPECT = 1275 / 812;
export const CARD_MAX_WIDTH = 360;
export const CARD_HEIGHT = Math.round(CARD_MAX_WIDTH / CARD_ASPECT);

/** Yüzde konumlar — kırpılmış görsele göre (çip + KART SAHİBİ / SON KULLANMA etiketleri) */
export const CARD_FIELD_LAYOUT = {
  front: {
    number: {
      left: '9%',
      top: '58.3%',
      width: '88.6%',
      fontSize: 17,
      letterSpacing: 2.4,
      textAlign: 'left',
    },
    holder: {
      left: '9.2%',
      top: '82%',
      width: '45.4%',
      fontSize: 14,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    expiry: {
      left: '56.9%',
      top: '82%',
      width: '34%',
      fontSize: 14,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
  },
  back: {
    cvv: {
      left: '69.4%',
      top: '47%',
      width: '13.6%',
      fontSize: 16,
      letterSpacing: 2,
      textAlign: 'center',
    },
  },
};
