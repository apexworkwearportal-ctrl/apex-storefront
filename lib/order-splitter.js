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
  
  const apparelItems = items.filter(i => Boolean(i.isCustom));
  const printItems = items.filter(i => !i.isCustom);

  const taxRate = calculateTaxRate(rawOrder.shippingAddress?.ShipState);
  const mainId = rawOrder.id;

  // Case 1: Pure Print Order
  if (printItems.length > 0 && apparelItems.length === 0) {
    return [{
      ...rawOrder,
      orderType: "print",
      fulfillmentType: "sinalite"
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

  // 1. Print Split Order (SinaLite)
  const printSubtotal = printItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0);
  const printTax = (printSubtotal + totalShippingFee) * taxRate;
  const printGrandTotal = printSubtotal + totalShippingFee + printTax;

  const printOrder = {
    ...rawOrder,
    id: `${mainId}-PRINT`,
    parentOrderId: mainId,
    isSplitOrder: true,
    splitType: "PRINT",
    orderType: "print",
    fulfillmentType: "sinalite",
    items: printItems,
    totals: {
      subtotal: printSubtotal.toFixed(2),
      shipping: totalShippingFee.toFixed(2),
      tax: printTax.toFixed(2),
      grandTotal: printGrandTotal.toFixed(2)
    }
  };

  // 2. Apparel Split Order (Admin Internal Fulfillment)
  const apparelSubtotal = apparelItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0);
  const apparelShippingFee = 0; // $0.00 apparel shipping fee when print items are present (admin handles)
  const apparelTax = (apparelSubtotal + apparelShippingFee) * taxRate;
  const apparelGrandTotal = apparelSubtotal + apparelShippingFee + apparelTax;

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
      shipping: "0.00",
      tax: apparelTax.toFixed(2),
      grandTotal: apparelGrandTotal.toFixed(2)
    },
    status: "pending_apparel_fulfillment"
  };

  return [printOrder, apparelOrder];
}
