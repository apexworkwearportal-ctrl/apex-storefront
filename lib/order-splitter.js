/**
 * Order Splitting Engine
 * Splits mixed customer cart orders into separate Print (SinaLite) and Apparel (Admin) orders.
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

  const apparelItems = items.filter(isApparelItem);
  const printItems = items.filter(i => !isApparelItem(i));

  const taxRate = calculateTaxRate(rawOrder.shippingAddress?.ShipState);
  const mainId = rawOrder.id;

  const totalDiscount = parseFloat(rawOrder.totals?.discount || rawOrder.promoCode?.discountAmount || 0);

  // Case 1: Pure Print Order (SinaLite or In-House Custom Print)
  if (printItems.length > 0 && apparelItems.length === 0) {
    const hasCustomPrint = printItems.some(i => i.isCustom);
    return [{
      ...rawOrder,
      orderType: hasCustomPrint ? "custom_print" : "print",
      fulfillmentType: hasCustomPrint ? "in_house_print" : "sinalite"
    }];
  }

  // Case 2: Pure Apparel Order
  if (apparelItems.length > 0 && printItems.length === 0) {
    return [{
      ...rawOrder,
      orderType: "apparel",
      fulfillmentType: "internal_admin"
    }];
  }

  // Case 3: Mixed Cart Order (Both Print and Apparel items exist) -> SPLIT INTO 2 SEPARATE ORDERS
  const totalShippingFee = parseFloat(rawOrder.totals?.shipping || 0);
  const rawSubtotal = parseFloat(rawOrder.totals?.subtotal || (printItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0) + apparelItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0)) || 1);

  // 1. Print Split Order
  const printSubtotal = printItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0);
  const printRatio = rawSubtotal > 0 ? (printSubtotal / rawSubtotal) : 0.5;
  const printDiscount = totalDiscount * printRatio;
  const printDiscountedSubtotal = Math.max(0, printSubtotal - printDiscount);
  const printTax = (printDiscountedSubtotal + totalShippingFee) * taxRate;
  const printGrandTotal = printDiscountedSubtotal + totalShippingFee + printTax;

  const hasCustomInPrint = printItems.some(i => i.isCustom);

  const printOrder = {
    ...rawOrder,
    id: `${mainId}-PRINT`,
    parentOrderId: mainId,
    isSplitOrder: true,
    splitType: "PRINT",
    orderType: hasCustomInPrint ? "custom_print" : "print",
    fulfillmentType: hasCustomInPrint ? "in_house_print" : "sinalite",
    items: printItems,
    totals: {
      subtotal: printSubtotal.toFixed(2),
      discount: printDiscount.toFixed(2),
      discountedSubtotal: printDiscountedSubtotal.toFixed(2),
      shipping: totalShippingFee.toFixed(2),
      tax: printTax.toFixed(2),
      grandTotal: printGrandTotal.toFixed(2)
    }
  };

  // 2. Apparel Split Order (Admin Internal Fulfillment)
  const apparelSubtotal = apparelItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0);
  const apparelDiscount = totalDiscount - printDiscount;
  const apparelDiscountedSubtotal = Math.max(0, apparelSubtotal - apparelDiscount);
  const apparelShippingFee = 0; // $0.00 apparel shipping fee when print items are present (admin handles)
  const apparelTax = (apparelDiscountedSubtotal + apparelShippingFee) * taxRate;
  const apparelGrandTotal = apparelDiscountedSubtotal + apparelShippingFee + apparelTax;

  const apparelOrder = {
    ...rawOrder,
    id: `${mainId}-APPAREL`,
    parentOrderId: mainId,
    isSplitOrder: true,
    splitType: "APPAREL",
    orderType: "apparel",
    fulfillmentType: "internal_admin",
    items: apparelItems,
    totals: {
      subtotal: apparelSubtotal.toFixed(2),
      discount: apparelDiscount.toFixed(2),
      discountedSubtotal: apparelDiscountedSubtotal.toFixed(2),
      shipping: "0.00",
      tax: apparelTax.toFixed(2),
      grandTotal: apparelGrandTotal.toFixed(2)
    },
    status: "pending_apparel_fulfillment"
  };

  return [printOrder, apparelOrder];
}
