export const DEFAULT_CUSTOM_PRINT_SETTINGS = {
  colorClickCharge: 0.08,      // $/click for color
  grayscaleClickCharge: 0.02,  // $/click for b&w / grayscale
  markupMultiplier: 2.0        // Multiplier over cost (e.g. 2.0 = 2x)
};

/**
 * Safely parse a quantity value from any format:
 * - numbers: returned as-is
 * - strings (with or without commas, e.g. "1,000"): parsed to int
 * - objects with a .value property: recursively parsed
 * Falls back to 1 if unparseable.
 */
export function parseQuantity(val) {
  if (typeof val === "number" && !isNaN(val)) return Math.max(1, Math.round(val));
  if (typeof val === "object" && val !== null && val.value !== undefined) {
    return parseQuantity(val.value);
  }
  if (val === null || val === undefined) return 1;
  // Strip commas and other non-numeric chars (except leading minus)
  const cleaned = String(val).replace(/,/g, "").trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 1 : Math.max(1, parsed);
}

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
 * Paper cost depends ONLY on physical sheets consumed - never on sides/pages.
 * Sides/pages only affect click cost (press passes).
 *
 * Simple product (sidesPagesType "sides"):
 * - sheets = ceil(quantity / imposition)
 * - clicks = sheets x sides
 * - paper_cost = sheets x (paper_cost_per_M / 1000)
 * - click_cost = clicks x click_charge
 *
 * Booklet / multi-page product (sidesPagesType "pages"):
 * - pages_per_sheet = imposition x 2
 * - interior_pages = total_pages (self-cover) or total_pages - 4 (separate cover stock)
 * - sheets_per_unit = ceil(interior_pages / pages_per_sheet)
 * - total_sheets = sheets_per_unit x quantity
 * - clicks = total_sheets x 2
 * - paper_cost = total_sheets x (paper_cost_per_M / 1000)
 * - click_cost = clicks x click_charge
 * - Plus-cover adds: cover_sheets = quantity, cover_clicks = cover_sheets x 2,
 *   cover_paper = cover_sheets x (cover_cost_per_M / 1000), cover_click_cost = cover_clicks x click_charge
 *
 * Cost = paper_cost + click_cost (+ cover cost)
 * Price = setup_charge (basePrice) + Cost x markup_multiplier
 */
export function calculateCustomPrintPrice({
  quantity = 1,
  size = null,           // { name: "8.5x11", imposition: 2, costPerM: 40 }
  sidesPages = 1,        // 1, 2, or "1 Sided", "2 Sided", "8 Pages", or choice obj
  sidesPagesType = null, // "sides" | "pages" (null = infer from the sidesPages label)
  coverStock = null,     // Plus-cover only: { costPerM } of the separate cover stock
  innerPaperCostPerM = null, // Replaces the size's paper cost per 1000 when set
  percentUpcharge = 0,   // % of (setup + cost x markup) added to the price
  printMode = "color",   // "color" | "bw" | "grayscale" or choice obj
  basePrice = 0,         // Product base price
  settings = DEFAULT_CUSTOM_PRINT_SETTINGS,
  additionalUpcharges = 0
}) {
  const numQty = parseQuantity(quantity);
  const numBasePrice = Math.max(0, parseFloat(basePrice) || 0);

  // 1. Resolve Size Imposition & Paper Cost per M
  const imposition = Math.max(1, parseFloat(size?.imposition || size?.impositions || 1));
  const sizePaperCostPerM = Math.max(0, parseFloat(size?.costPerM ?? size?.paperCostPerM ?? size?.cost_per_m ?? 0));
  const paperCostPerM = innerPaperCostPerM !== null && innerPaperCostPerM !== undefined && !isNaN(parseFloat(innerPaperCostPerM))
    ? Math.max(0, parseFloat(innerPaperCostPerM))
    : sizePaperCostPerM;

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

  // 5. Sheets, clicks and paper cost (paper depends only on sheets)
  const sidesPagesLabel = typeof sidesPages === "object" && sidesPages !== null
    ? (sidesPages.name || sidesPages.label || "")
    : String(sidesPages ?? "");
  const isBooklet = sidesPagesType
    ? sidesPagesType === "pages"
    : sidesPagesLabel.toLowerCase().includes("page");
  const hasCover = isBooklet && !!coverStock;
  const coverCostPerM = hasCover ? Math.max(0, parseFloat(coverStock.costPerM ?? coverStock.paperCostPerM ?? 0)) : 0;

  let sheets, clicks, pagesPerSheet = null, interiorPages = null, sheetsPerUnit = null;
  if (isBooklet) {
    pagesPerSheet = imposition * 2;
    interiorPages = hasCover ? Math.max(0, sidesCount - 4) : sidesCount;
    sheetsPerUnit = Math.ceil(interiorPages / pagesPerSheet);
    sheets = sheetsPerUnit * numQty;
    clicks = sheets * 2;
  } else {
    sheets = Math.ceil(numQty / imposition);
    clicks = sheets * sidesCount;
  }

  const intPaperCost = sheets * (paperCostPerM / 1000);
  const intClickCost = clicks * clickCharge;
  let paperCost = intPaperCost;
  let clickCost = intClickCost;
  let coverPaperCost = 0, coverClickCost = 0;
  if (hasCover) {
    // 1 folded cover sheet per booklet, printed 2-sided
    sheets += numQty;
    clicks += numQty * 2;
    coverPaperCost = numQty * (coverCostPerM / 1000);
    coverClickCost = numQty * 2 * clickCharge;
    paperCost += coverPaperCost;
    clickCost += coverClickCost;
  }
  // Booklets round cost to cents before markup (matches Suite calcBooklet)
  const totalCost = isBooklet
    ? Math.round((intPaperCost + coverPaperCost + intClickCost + coverClickCost) * 100) / 100
    : paperCost + clickCost;

  // 7. Calculate Final Selling Price
  const extraUpcharges = Math.max(0, parseFloat(additionalUpcharges) || 0);
  const markupCost = totalCost * markupMultiplier;
  const percentAmount = (numBasePrice + markupCost) * (Math.max(0, parseFloat(percentUpcharge) || 0) / 100);
  const calculatedPrice = numBasePrice + markupCost + percentAmount + extraUpcharges;
  const finalPrice = Math.round(calculatedPrice * 100) / 100;
  const unitPrice = Math.round((finalPrice / numQty) * 100) / 100;

  return {
    quantity: numQty,
    imposition,
    paperCostPerM,
    sidesCount,
    printMode: isColor ? "colour" : "b&w",
    clickCharge,
    sheets,
    clicks,
    paperCost: Math.round(paperCost * 100) / 100,
    clickCost: Math.round(clickCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    basePrice: numBasePrice,
    markupMultiplier,
    markupCost: Math.round(markupCost * 100) / 100,
    additionalUpcharges: extraUpcharges,
    percentUpcharge: Math.round(percentAmount * 100) / 100,
    finalPrice,
    unitPrice,
    breakdown: {
      formula: `Price = Base ($${numBasePrice.toFixed(2)}) + [Cost ($${totalCost.toFixed(2)}) × Multiplier (${markupMultiplier}x)]`,
      clicksFormula: isBooklet
        ? `${interiorPages} interior pages / ${pagesPerSheet} pages per sheet = ${sheetsPerUnit} sheets/unit x ${numQty} qty = ${sheets} sheets x 2 = ${clicks} clicks`
        : `${numQty} qty / ${imposition} imposition = ${sheets} sheets x ${sidesCount} sides = ${clicks} clicks`,
      clickCostFormula: `${clicks} clicks x $${clickCharge.toFixed(3)} = $${clickCost.toFixed(2)}`,
      paperCostFormula: `${sheets} sheets x ($${paperCostPerM.toFixed(2)}/M / 1000) = $${paperCost.toFixed(2)}`
    }
  };
}

/**
 * Additional option groups.
 *
 * Each group has a `kind`:
 * - "flat":        choice adds `priceUpcharge` dollars (legacy behaviour, default)
 * - "percent":     choice adds `percent` % of the order subtotal (setup + cost x markup)
 *                  and/or a flat `priceUpcharge` (e.g. lamination)
 * - "inner_paper": choice REPLACES the size's paper cost per 1000 with `costPerM`
 *                  (blank costPerM = keep the size's regular paper)
 * - "cover":       booklet only. Blank costPerM = self cover; otherwise a separate
 *                  cover stock priced at `costPerM` per 1000 sheets
 *
 * Exactly one choice per group is the default (`isDefault`), falling back to the first.
 */
export const OPTION_KINDS = [
  { value: "flat", label: "Flat price add-on" },
  { value: "percent", label: "Percent / flat add-on (e.g. lamination)" },
  { value: "inner_paper", label: "Inner paper (replaces paper cost per 1000)" },
  { value: "cover", label: "Cover (self cover or separate cover stock)" }
];

export function getDefaultChoiceIndex(group) {
  const choices = group?.choices || [];
  const idx = choices.findIndex(c => c.isDefault);
  return idx >= 0 ? idx : 0;
}

const numOrNull = v => {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.max(0, n);
};

/**
 * Combine the selected choice of each extra option group into pricing inputs.
 * `selected` is an array of { kind, choice }.
 */
export function resolveExtraChoices(selected = []) {
  const out = { innerPaperCostPerM: null, coverStock: null, percentUpcharge: 0, additionalUpcharges: 0 };
  for (const { kind = "flat", choice } of selected) {
    if (!choice) continue;
    if (kind === "inner_paper") {
      const c = numOrNull(choice.costPerM);
      if (c !== null) out.innerPaperCostPerM = c;
    } else if (kind === "cover") {
      const c = numOrNull(choice.costPerM);
      if (c !== null) out.coverStock = { costPerM: c };
    } else {
      out.additionalUpcharges += parseFloat(choice.priceUpcharge) || 0;
      if (kind === "percent") out.percentUpcharge += parseFloat(choice.percent) || 0;
    }
  }
  return out;
}

/** Default selections for admin simulators: groups come from the saved `options` array. */
export function getDefaultExtras(optionGroups = []) {
  return resolveExtraChoices(
    (optionGroups || []).map(g => ({ kind: g.kind || "flat", choice: (g.choices || [])[getDefaultChoiceIndex(g)] }))
  );
}
