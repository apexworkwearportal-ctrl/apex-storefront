export const DEFAULT_CUSTOM_PRINT_SETTINGS = {
  colorClickCharge: 0.08,      // $/click for color
  grayscaleClickCharge: 0.02,  // $/click for b&w / grayscale
  markupMultiplier: 2.0        // Multiplier over cost (e.g. 2.0 = 2x)
};

/**
 * Parse sides / pages value into a numeric multiplier
 */
export function parseSidesOrPages(val) {
  if (typeof val === "number" && !isNaN(val)) return Math.max(1, val);
  if (!val) return 1;

  const str = String(val).toLowerCase().trim();
  if (str.includes("2 sided") || str.includes("2-sided") || str.includes("double") || str.includes("both")) {
    return 2;
  }
  if (str.includes("1 sided") || str.includes("1-sided") || str.includes("single") || str.includes("front only")) {
    return 1;
  }

  // Check for numeric match e.g. "8 Pages", "16pp", "4"
  const match = str.match(/\d+/);
  if (match) {
    return Math.max(1, parseInt(match[0], 10));
  }

  return 1;
}

/**
 * Core Pricing Calculation Formula for Custom Print Products
 * 
 * Formula:
 * - clicks = quantity / imposition
 * - click_charge = colorClickCharge or grayscaleClickCharge
 * - paper_cost = (sides/pages × paper_cost_per_M / 1000) × clicks
 * - click_cost = clicks × click_charge
 * - Cost = paper_cost + click_cost
 * - Price = base_price + Cost × markup_multiplier
 */
export function calculateCustomPrintPrice({
  quantity = 1,
  size = null,           // { name: "8.5x11", imposition: 2, costPerM: 40 }
  sidesPages = 1,        // 1, 2, or "1 Sided", "2 Sided", "8 Pages", or choice obj
  printMode = "color",   // "color" | "bw" | "grayscale" or choice obj
  basePrice = 0,         // Product base price
  settings = DEFAULT_CUSTOM_PRINT_SETTINGS,
  additionalUpcharges = 0
}) {
  const numQty = Math.max(1, parseInt(quantity, 10) || 1);
  const numBasePrice = Math.max(0, parseFloat(basePrice) || 0);

  // 1. Resolve Size Imposition & Paper Cost per M
  const imposition = Math.max(1, parseFloat(size?.imposition || size?.impositions || 1));
  const paperCostPerM = Math.max(0, parseFloat(size?.costPerM ?? size?.paperCostPerM ?? size?.cost_per_m ?? 0));

  // 2. Resolve Sides / Pages Count
  let sidesCount = 1;
  if (typeof sidesPages === "object" && sidesPages !== null) {
    sidesCount = sidesPages.value ? parseFloat(sidesPages.value) : parseSidesOrPages(sidesPages.name || sidesPages.label);
  } else {
    sidesCount = parseSidesOrPages(sidesPages);
  }

  // 3. Resolve Print Mode (Color vs B&W)
  let isColor = true;
  if (typeof printMode === "object" && printMode !== null) {
    const modeStr = (printMode.type || printMode.id || printMode.name || "").toLowerCase();
    isColor = !modeStr.includes("bw") && !modeStr.includes("b&w") && !modeStr.includes("gray") && !modeStr.includes("black");
  } else if (typeof printMode === "string") {
    const modeStr = printMode.toLowerCase();
    isColor = !modeStr.includes("bw") && !modeStr.includes("b&w") && !modeStr.includes("gray") && !modeStr.includes("black");
  }

  // 4. Resolve Click Charge from Settings
  const colorCharge = parseFloat(settings?.colorClickCharge ?? DEFAULT_CUSTOM_PRINT_SETTINGS.colorClickCharge);
  const bwCharge = parseFloat(settings?.grayscaleClickCharge ?? DEFAULT_CUSTOM_PRINT_SETTINGS.grayscaleClickCharge);
  const clickCharge = isColor ? colorCharge : bwCharge;
  const markupMultiplier = Math.max(1, parseFloat(settings?.markupMultiplier ?? DEFAULT_CUSTOM_PRINT_SETTINGS.markupMultiplier));

  // 5. Calculate Clicks
  const clicks = numQty / imposition;

  // 6. Calculate Paper Cost & Click Cost
  // Paper cost per sheet = (sidesCount * paperCostPerM) / 1000
  const paperCost = (sidesCount * (paperCostPerM / 1000)) * clicks;
  const clickCost = clicks * clickCharge;
  const totalCost = paperCost + clickCost;

  // 7. Calculate Final Selling Price
  const extraUpcharges = Math.max(0, parseFloat(additionalUpcharges) || 0);
  const markupCost = totalCost * markupMultiplier;
  const calculatedPrice = numBasePrice + markupCost + extraUpcharges;
  const finalPrice = Math.round(calculatedPrice * 100) / 100;
  const unitPrice = Math.round((finalPrice / numQty) * 100) / 100;

  return {
    quantity: numQty,
    imposition,
    paperCostPerM,
    sidesCount,
    printMode: isColor ? "colour" : "b&w",
    clickCharge,
    clicks: Math.round(clicks * 100) / 100,
    paperCost: Math.round(paperCost * 100) / 100,
    clickCost: Math.round(clickCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    basePrice: numBasePrice,
    markupMultiplier,
    markupCost: Math.round(markupCost * 100) / 100,
    additionalUpcharges: extraUpcharges,
    finalPrice,
    unitPrice,
    breakdown: {
      formula: `Price = Base ($${numBasePrice.toFixed(2)}) + [Cost ($${totalCost.toFixed(2)}) × Multiplier (${markupMultiplier}x)]`,
      clicksFormula: `${numQty} qty ÷ ${imposition} imposition = ${clicks.toFixed(2)} clicks`,
      clickCostFormula: `${clicks.toFixed(2)} clicks × $${clickCharge.toFixed(3)} = $${clickCost.toFixed(2)}`,
      paperCostFormula: `(${sidesCount} sides × $${paperCostPerM.toFixed(2)}/M ÷ 1000) × ${clicks.toFixed(2)} sheets = $${paperCost.toFixed(2)}`
    }
  };
}
