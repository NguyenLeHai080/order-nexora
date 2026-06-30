/**
 * Công thức giá theo mô hình "3 giá" NCC:
 * - base_price    : giá vốn / giá CTV (phải trả NCC) — dùng tính lợi nhuận.
 * - regular_price : giá niêm yết NCC — gốc tính giá bán cho khách.
 * - markup        : phần cộng thêm tùy chọn trên giá niêm yết (mặc định 0).
 *
 * Giá bán = giá niêm yết × (1 + %/100) + cố định.  Lợi nhuận/đơn = giá bán − giá vốn.
 */

/** Giá niêm yết làm gốc tính giá bán: regular_price nếu có, ngược lại fallback base_price. */
export function listPrice(basePrice: string, regularPrice?: string | null): number {
  const reg = regularPrice != null && regularPrice !== '' ? parseFloat(regularPrice) : NaN;
  return Number.isFinite(reg) ? reg : parseFloat(basePrice || '0');
}

/** Giá bán = giá niêm yết × (1 + percent/100) + amount. Markup 0 → bán đúng giá niêm yết. */
export function computeSalePrice(
  basePrice: string,
  regularPrice: string | null | undefined,
  markupPercent: string,
  markupAmount: string,
): number {
  return (
    listPrice(basePrice, regularPrice) * (1 + parseFloat(markupPercent || '0') / 100) +
    parseFloat(markupAmount || '0')
  );
}

/** Lợi nhuận trên 1 đơn vị = giá bán − giá vốn (base_price = giá CTV/NCC). */
export function computeUnitProfit(
  basePrice: string,
  regularPrice: string | null | undefined,
  markupPercent: string,
  markupAmount: string,
): number {
  return (
    computeSalePrice(basePrice, regularPrice, markupPercent, markupAmount) -
    parseFloat(basePrice || '0')
  );
}

/** Biên lợi nhuận (%) = lợi nhuận / giá bán × 100. */
export function computeMargin(
  basePrice: string,
  regularPrice: string | null | undefined,
  markupPercent: string,
  markupAmount: string,
): number {
  const sale = computeSalePrice(basePrice, regularPrice, markupPercent, markupAmount);
  if (sale <= 0) return 0;
  return (computeUnitProfit(basePrice, regularPrice, markupPercent, markupAmount) / sale) * 100;
}

/** Suy ngược % markup khi biết giá bán mong muốn và giá niêm yết (amount cố định = 0). */
export function percentFromTargetPrice(
  basePrice: string,
  regularPrice: string | null | undefined,
  targetPrice: string,
): number {
  const lp = listPrice(basePrice, regularPrice);
  const target = parseFloat(targetPrice || '0');
  if (lp <= 0) return 0;
  return (target / lp - 1) * 100;
}
