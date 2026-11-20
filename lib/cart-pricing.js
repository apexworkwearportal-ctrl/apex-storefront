/**
 * Single source of truth for cart / order money math.
 *
 * Line total rules:
 * - Apparel lines carry an authoritative `totalPrice` (garments x unit price, sale
 *   discount applied, plus any one-time embroidery setup fee). Unit price x quantity
 *   can NOT reproduce it (setup fee, cent rounding), so totalPrice wins.
 * - Everything else (print jobs) is price x quantity.
 */

export const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function getLineTotal(item) {
  if (!item) return 0;
  const qty = parseInt(item.quantity) || 1;
  if (item.isApparel && Number.isFinite(parseFloat(item.totalPrice))) {
    return round2(Math.max(0, num(item.totalPrice)));
  }
  return round2(Math.max(0, num(item.price)) * qty);
}

/** Pre-sale line total, used for the strike-through price. null when no sale. */
export function getLineOriginalTotal(item) {
  if (!item) return null;
  const qty = parseInt(item.quantity) || 1;
  if (item.isApparel && Number.isFinite(parseFloat(item.originalTotal))) {
    const t = round2(num(item.originalTotal));
    return t > getLineTotal(item) ? t : null;
  }
  const orig = num(item.originalPrice);
  if (orig > 0 && orig > num(item.price)) return round2(orig * qty);
  return null;
}

export function getCartSubtotal(items = []) {
  return round2(items.reduce((acc, i) => acc + getLineTotal(i), 0));
}

export function getTaxRate(province) {
  const p = province ? String(province).toUpperCase().trim() : "";
  if (["ON", "ONTARIO"].includes(p)) return 0.13;
  if (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(p)) return 0.15;
  return 0.05;
}

/**
 * Totals with every component rounded to cents, and grandTotal = the sum of the
 * rounded parts, so what the cart shows, what Stripe charges and what the order
 * stores can never differ by a cent.
 */
export function computeTotals({ subtotal, discount = 0, shipping = 0, taxRate }) {
  const sub = round2(subtotal);
  const disc = round2(Math.min(Math.max(0, num(discount)), sub));
  const discountedSubtotal = round2(sub - disc);
  const ship = round2(Math.max(0, num(shipping)));
  const tax = round2((discountedSubtotal + ship) * taxRate);
  const grandTotal = round2(discountedSubtotal + ship + tax);
  return { subtotal: sub, discount: disc, discountedSubtotal, shipping: ship, tax, grandTotal };
}
