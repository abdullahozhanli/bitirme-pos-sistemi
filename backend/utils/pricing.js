/**
 * Ürün ve kampanya fiyat yardımcıları
 */

function isSaleActive(product, now = new Date()) {
  if (product.salePrice == null || product.salePrice === '') return false;
  const sale = Number(product.salePrice);
  const list = Number(product.price);
  if (!Number.isFinite(sale) || sale < 0 || !Number.isFinite(list)) return false;
  if (sale >= list) return false;

  const start = product.saleStartsAt ? new Date(product.saleStartsAt) : null;
  const end = product.saleEndsAt ? new Date(product.saleEndsAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function effectivePrice(product, now = new Date()) {
  const list = Number(product.price) || 0;
  if (isSaleActive(product, now)) {
    return Number(Number(product.salePrice).toFixed(2));
  }
  return Number(list.toFixed(2));
}

function formatProductPricing(product, now = new Date()) {
  const listPrice = Number(product.price) || 0;
  const onSale = isSaleActive(product, now);
  const eff = effectivePrice(product, now);
  return {
    listPrice,
    price: eff,
    effectivePrice: eff,
    originalPrice: listPrice,
    isOnSale: onSale,
    salePrice: onSale ? eff : null,
  };
}

function isCampaignActive(campaign, now = new Date()) {
  if (!campaign || !campaign.isActive) return false;
  const start = campaign.startsAt ? new Date(campaign.startsAt) : null;
  const end = campaign.endsAt ? new Date(campaign.endsAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function campaignDiscountAmount(subtotal, campaign) {
  const rate = Number(campaign?.discountRate) || 0;
  if (rate <= 0 || rate > 1) return 0;
  return Number((subtotal * rate).toFixed(2));
}

module.exports = {
  isSaleActive,
  effectivePrice,
  formatProductPricing,
  isCampaignActive,
  campaignDiscountAmount,
};
