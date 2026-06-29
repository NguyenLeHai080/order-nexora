/** Công thức giá bán: sale = base × (1 + percent/100) + amount. */
export function computeSalePrice(basePrice: string, markupPercent: string, markupAmount: string): number {
  return (
    parseFloat(basePrice || '0') * (1 + parseFloat(markupPercent || '0') / 100) +
    parseFloat(markupAmount || '0')
  );
}

/** Lợi nhuận trên 1 đơn vị = giá bán - giá vốn (giá nhà cung cấp). */
export function computeUnitProfit(basePrice: string, markupPercent: string, markupAmount: string): number {
  return computeSalePrice(basePrice, markupPercent, markupAmount) - parseFloat(basePrice || '0');
}

/** Biên lợi nhuận (%) = lợi nhuận / giá bán × 100. */
export function computeMargin(basePrice: string, markupPercent: string, markupAmount: string): number {
  const sale = computeSalePrice(basePrice, markupPercent, markupAmount);
  if (sale <= 0) return 0;
  return (computeUnitProfit(basePrice, markupPercent, markupAmount) / sale) * 100;
}

/** Suy ngược % markup khi biết giá bán mong muốn và giá vốn (amount cố định = 0). */
export function percentFromTargetPrice(basePrice: string, targetPrice: string): number {
  const base = parseFloat(basePrice || '0');
  const target = parseFloat(targetPrice || '0');
  if (base <= 0) return 0;
  return (target / base - 1) * 100;
}
