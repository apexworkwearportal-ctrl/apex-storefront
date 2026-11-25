/**
 * Order Splitting Engine
 * Splits mixed customer cart orders into distinct fulfillment jobs:
 * 1. SinaLite Print (External API production & wholesale shipping)
 * 2. In-House Custom Print (Workshop printing & internal finishing)
 * 3. Apparel Workshop (DTF/Embroidery garment production)
 */

function calculateTaxRate(province) {
  const p = province ? province.toUpperCase().trim() : "";
  if (["ON", "ONTARIO"].includes(p)) return 0.13;
  if (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(p)) return 0.15;
  return 0.05;
}

export function splitOrderIfNeeded(rawOrder) {
  const items = rawOrder.items || [];
  
  const isApparelItem = (i) => Boolean(
    i.isApparel ||
    i.category === "apparel" ||
    i.categoryId === "apparel" ||
    i.apparelViews ||
    i.garmentViews ||
    i.selectedSizes ||
    i.embroiderySetupFee > 0 ||
    i.isEmbroidery
  );

  const isCustomPrintItem = (i) => !isApparelItem(i) && Boolean(
    i.isCustom ||
    isNaN(parseInt(i.productId)) ||
    i.customPrintSizes ||
    i.sidesPages
  );

  const isSinaliteItem = (i) => !isApparelItem(i) && !isCustomPrintItem(i) && !isNaN(parseInt(i.productId));

  const sinaliteItems = items.filter(isSinaliteItem);
  const customPrintItems = items.filter(isCustomPrintItem);
  const apparelItems = items.filter(isApparelItem);

  const activeGroupCount = (sinaliteItems.length > 0 ? 1 : 0) +
                           (customPrintItems.length > 0 ? 1 : 0) +
                           (apparelItems.length > 0 ? 1 : 0);

  // Single-group orders: no split needed
  if (activeGroupCount <= 1) {
    if (customPrintItems.length > 0) {
      return [{
        ...rawOrder,
        orderType: "custom_print",
        fulfillmentType: "in_house_print"
      }];
    }
    if (apparelItems.length > 0) {
      return [{
        ...rawOrder,
        orderType: "apparel",
        fulfillmentType: "internal_admin"
      }];
    }
    return [{
      ...rawOrder,
      orderType: "print",
      fulfillmentType: "sinalite"
    }];
  }

  // Multi-group orders: split into separate fulfillment sub-orders
  const taxRate = calculateTaxRate(rawOrder.shippingAddress?.ShipState);
  const mainId = rawOrder.id;
  const totalDiscount = parseFloat(rawOrder.totals?.discount || rawOrder.promoCode?.discountAmount || 0);
  const totalShippingFee = parseFloat(rawOrder.totals?.shipping || 0);

  const rawSubtotal = parseFloat(
    rawOrder.totals?.subtotal ||
    items.reduce((acc, i) => acc + (parseFloat(i.price) * (parseInt(i.quantity) || 1)), 0) ||
    1
  );

  const splitOrders = [];

  // 1. SinaLite Print Split Order
  if (sinaliteItems.length > 0) {
    const subtotal = sinaliteItems.reduce((acc, i) => acc + (parseFloat(i.price) * (parseInt(i.quantity) || 1)), 0);
    const ratio = rawSubtotal > 0 ? (subtotal / rawSubtotal) : (1 / activeGroupCount);
    const discount = totalDiscount * ratio;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    // SinaLite receives the full shipping fee if courier shipping was selected
    const shipping = totalShippingFee;
    const tax = (discountedSubtotal + shipping) * taxRate;
    const grandTotal = discountedSubtotal + shipping + tax;

    splitOrders.push({
      ...rawOrder,
      id: `${mainId}-SINALITE`,
      parentOrderId: mainId,
      isSplitOrder: true,
      splitType: "SINALITE",
      orderType: "print",
      fulfillmentType: "sinalite",
      items: sinaliteItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        grandTotal: grandTotal.toFixed(2)
      }
    });
  }

  // 2. Custom Print Split Order
  if (customPrintItems.length > 0) {
    const subtotal = customPrintItems.reduce((acc, i) => acc + (parseFloat(i.price) * (parseInt(i.quantity) || 1)), 0);
    const ratio = rawSubtotal > 0 ? (subtotal / rawSubtotal) : (1 / activeGroupCount);
    const discount = totalDiscount * ratio;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    // If SinaLite items exist, shipping fee was allocated to SinaLite; otherwise allocate here
    const shipping = sinaliteItems.length === 0 ? totalShippingFee : 0;
    const tax = (discountedSubtotal + shipping) * taxRate;
    const grandTotal = discountedSubtotal + shipping + tax;

    splitOrders.push({
      ...rawOrder,
      id: `${mainId}-CUSTOM`,
      parentOrderId: mainId,
      isSplitOrder: true,
      splitType: "CUSTOM",
      orderType: "custom_print",
      fulfillmentType: "in_house_print",
      items: customPrintItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        grandTotal: grandTotal.toFixed(2)
      }
    });
  }

  // 3. Apparel Split Order
  if (apparelItems.length > 0) {
    const subtotal = apparelItems.reduce((acc, i) => acc + (parseFloat(i.price) * (parseInt(i.quantity) || 1)), 0);
    const ratio = rawSubtotal > 0 ? (subtotal / rawSubtotal) : (1 / activeGroupCount);
    const discount = totalDiscount * ratio;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    // Only allocate shipping fee if neither SinaLite nor Custom Print items exist
    const shipping = (sinaliteItems.length === 0 && customPrintItems.length === 0) ? totalShippingFee : 0;
    const tax = (discountedSubtotal + shipping) * taxRate;
    const grandTotal = discountedSubtotal + shipping + tax;

    splitOrders.push({
      ...rawOrder,
      id: `${mainId}-APPAREL`,
      parentOrderId: mainId,
      isSplitOrder: true,
      splitType: "APPAREL",
      orderType: "apparel",
      fulfillmentType: "internal_admin",
      items: apparelItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        grandTotal: grandTotal.toFixed(2)
      },
      status: "pending_apparel_fulfillment"
    });
  }

  return splitOrders;
}
