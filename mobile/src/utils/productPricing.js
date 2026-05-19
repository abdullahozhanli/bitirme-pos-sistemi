export function getProductDisplayPrices(item) {
  const effective = Number(item?.price ?? item?.effectivePrice ?? 0);
  const list = Number(item?.listPrice ?? item?.originalPrice ?? effective);
  const isOnSale = Boolean(item?.isOnSale) || (list > effective + 0.001);
  return {
    effective,
    list,
    isOnSale,
  };
}
