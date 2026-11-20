export const DEFAULT_CUSTOM_PRINT_SETTINGS = {
  colorClickCharge: 0.05,      // $/click for color
  grayscaleClickCharge: 0.02,  // $/click for b&w / grayscale
  markupMultiplier: 3.0        // Multiplier over cost (e.g. 3.0 = 3x)
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
  const cleaned = String(val).replace(/,/g, "").trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 1 : Math.max(1, parsed);
}

/**
 * Parse sides or pages value into a numeric multiplier
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
 * Supports two distinct modes:
 * 1. Standard Flat Products (Sides)
 *    1. sheets needed = round up ( quantity ÷ imposition )
 *    2. clicks = sheets × sides
 *    3. paper cost = sheets × (cost per 1,000 sheets ÷ 1,000)
 *    4. click cost = clicks × price per click
 *    5. cost = paper cost + click cost
 *    6. price = setup fee + ( cost × markup )
 * 
 * 2. Multipage / Booklet Products (Pages)
 *    1. pages per sheet = imposition × 2
 *    2. inside pages = total pages, or total pages − 4 if there is a separate cover
 *    3. sheets per booklet = round up ( inside pages ÷ pages per sheet )
 *    4. inside sheets total = sheets per booklet × quantity
 *    5. Inside pagespaper cost = sheets × (cost per 1,000 sheets ÷ 1,000)
 *    6. Inside pagesclick cost = clicks × price per click
 *    7. cost = paper cost + click cost (including separate cover paper + clicks if selected)
 *    8. price = setup fee + ( cost × markup )
 * 
 * Note: In both formulas, setup fee is the product's base price.
 */
export function calculateCustomPrintPrice({
  quantity = 1,
  size = null,           // { name: "8.5x11", imposition: 2, costPerM: 67.50, paperName: "100lb Gloss Text" }
  sidesPages = 1,        // 1, 2, or "1 Sided", "2 Sided", "8 Pages", or choice obj
  sidesPagesType = null, // "sides" | "pages" (auto-detected if omitted)
  hasSeparateCover = false, // boolean or "separate_cover"
  coverPaper = null,     // { name: "80lb Gloss Cover", costPerM: 125.25 }
  printMode = "color",   // "color" | "bw" | "grayscale" or choice obj
  basePrice = 0,         // Product base price (serves as setup fee)
  settings = DEFAULT_CUSTOM_PRINT_SETTINGS,
  additionalUpcharges = 0
}) {
  const numQty = parseQuantity(quantity);
  const setupFee = Math.max(0, parseFloat(basePrice) || 0);

  // 1. Resolve Imposition, Paper Cost, & Paper Stock Name
  const imposition = Math.max(1, parseFloat(size?.imposition || size?.impositions || 1));
  const paperCostPerM = Math.max(0, parseFloat(size?.costPerM ?? size?.paperCostPerM ?? size?.cost_per_m ?? 0));
  const paperName = size?.paperName || size?.paperStock || size?.name || "Paper Stock";

  // 2. Resolve Print Mode (Color vs B&W)
  let isColor = true;
  if (typeof printMode === "object" && printMode !== null) {
    const modeStr = (printMode.type || printMode.id || printMode.name || "").toLowerCase();
    isColor = !modeStr.includes("bw") && !modeStr.includes("b&w") && !modeStr.includes("gray") && !modeStr.includes("black");
  } else if (typeof printMode === "string") {
    const modeStr = printMode.toLowerCase();
    isColor = !modeStr.includes("bw") && !modeStr.includes("b&w") && !modeStr.includes("gray") && !modeStr.includes("black");
  }

  // 3. Resolve Click Charge & Markup Multiplier from Settings
  const colorCharge = parseFloat(settings?.colorClickCharge ?? DEFAULT_CUSTOM_PRINT_SETTINGS.colorClickCharge);
  const bwCharge = parseFloat(settings?.grayscaleClickCharge ?? DEFAULT_CUSTOM_PRINT_SETTINGS.grayscaleClickCharge);
  const clickCharge = isColor ? colorCharge : bwCharge;
  const markupMultiplier = Math.max(1, parseFloat(settings?.markupMultiplier ?? DEFAULT_CUSTOM_PRINT_SETTINGS.markupMultiplier));
  const extraUpcharges = Math.max(0, parseFloat(additionalUpcharges) || 0);

  // 4. Detect whether this is a Booklet/Multipage (Pages) product or Flat (Sides) product
  const rawSidesPagesStr = typeof sidesPages === "object" && sidesPages !== null
    ? String(sidesPages.name || sidesPages.label || sidesPages.id || "")
    : String(sidesPages || "");

  const isPagesMode = sidesPagesType === "pages" ||
    (typeof sidesPages === "object" && (sidesPages?.type === "pages" || rawSidesPagesStr.toLowerCase().includes("page"))) ||
    rawSidesPagesStr.toLowerCase().includes("page");

  // ─────────────────────────────────────────────────────────────────────────────
  // BOOKLET / MULTIPAGE PRODUCTS (PAGES FORMULA)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPagesMode) {
    let totalPages = 8;
    if (typeof sidesPages === "object" && sidesPages !== null && sidesPages.value !== undefined) {
      totalPages = Math.max(1, parseInt(sidesPages.value, 10) || 8);
    } else {
      const match = rawSidesPagesStr.match(/\d+/);
      totalPages = match ? Math.max(1, parseInt(match[0], 10)) : (parseInt(sidesPages, 10) || 8);
    }

    const separateCoverChosen = Boolean(
      hasSeparateCover === true ||
      hasSeparateCover === "separate_cover" ||
      hasSeparateCover === "yes" ||
      hasSeparateCover === "Separate Cover" ||
      (typeof hasSeparateCover === "string" && hasSeparateCover.toLowerCase().includes("separate"))
    );

    // Step 1: pages per sheet = imposition × 2
    const pagesPerSheet = imposition * 2;

    // Step 2: inside pages = total pages, or total pages − 4 if there is a separate cover
    const insidePages = separateCoverChosen ? Math.max(0, totalPages - 4) : totalPages;

    // Step 3: sheets per booklet = round up ( inside pages ÷ pages per sheet )
    const sheetsPerBooklet = Math.max(1, Math.ceil(insidePages / pagesPerSheet));

    // Step 4: inside sheets total = sheets per booklet × quantity
    const insideSheetsTotal = sheetsPerBooklet * numQty;

    // Step 5: Inside pagespaper cost = sheets × (cost per 1,000 sheets ÷ 1,000)
    const insideCostPerSheet = paperCostPerM / 1000;
    const insidePaperCost = insideSheetsTotal * insideCostPerSheet;

    // Step 6: Inside pagesclick cost = clicks × price per click (every inside sheet printed 2-sided)
    const insideClicks = insideSheetsTotal * 2;
    const insideClickCost = insideClicks * clickCharge;

    // Step 7: Cover calculations if separate cover is added
    let coverSheets = 0;
    let coverClicks = 0;
    let coverPaperCost = 0;
    let coverClickCost = 0;
    const coverCostPerM = coverPaper?.costPerM
      ? parseFloat(coverPaper.costPerM)
      : (paperCostPerM > 0 ? paperCostPerM * 1.5 : 125.25);
    const coverPaperName = coverPaper?.name || coverPaper?.paperStock || coverPaper?.type || "Heavy Cover Stock";
    const coverCostPerSheet = coverCostPerM / 1000;

    if (separateCoverChosen) {
      // cover sheets = quantity (one folded sheet = one cover)
      coverSheets = numQty;
      // 2 passes/clicks per folded cover sheet (outside cover & inside cover)
      coverClicks = coverSheets * 2;
      coverPaperCost = coverSheets * coverCostPerSheet;
      coverClickCost = coverClicks * clickCharge;
    }

    const totalPaperCost = insidePaperCost + coverPaperCost;
    const totalClickCost = insideClickCost + coverClickCost;
    const totalCost = totalPaperCost + totalClickCost;

    // Price calculation
    const markupCost = totalCost * markupMultiplier;
    const calculatedPrice = setupFee + markupCost + extraUpcharges;
    const finalPrice = Math.round(calculatedPrice * 100) / 100;
    const unitPrice = Math.round((finalPrice / numQty) * 100) / 100;

    // Explanation Steps matching the specification
    const steps = separateCoverChosen ? [
      {
        number: 1,
        formula: "pages per sheet = imposition × 2",
        explanation: `Every sheet is printed on both sides, so imposition ${imposition} × 2 = ${pagesPerSheet} pages fit on one sheet.`
      },
      {
        number: 2,
        formula: "inside pages = total pages, or total pages - 4 if there is a separate cover",
        explanation: `A separate cover takes 4 pages, so ${totalPages} − 4 = ${insidePages} pages count as inside pages.`
      },
      {
        number: 3,
        formula: "sheets per booklet = round up ( inside pages ÷ pages per sheet )",
        explanation: `${insidePages} ÷ ${pagesPerSheet} = ${(insidePages / pagesPerSheet).toFixed(2)}, rounded up to ${sheetsPerBooklet} sheet(s) per booklet.`
      },
      {
        number: 4,
        formula: "inside sheets total = sheets per booklet × quantity",
        explanation: `${sheetsPerBooklet} × ${numQty.toLocaleString()} booklets = ${insideSheetsTotal.toLocaleString()} sheets.`
      },
      {
        number: 5,
        formula: "Inside pagespaper cost = sheets × (cost per 1,000 sheets ÷ 1,000)",
        explanation: `Inside pages: ${paperName} costs $${paperCostPerM.toFixed(2)} per 1,000 sheets, which is $${insideCostPerSheet.toFixed(2)} per sheet. ${insideSheetsTotal.toLocaleString()} sheets × $${insideCostPerSheet.toFixed(2)} = $${insidePaperCost.toFixed(2)}.`
      },
      {
        number: 6,
        formula: "Inside pagesclick cost = clicks × price per click",
        explanation: `Inside pages: a "click" is one pass of one side of one sheet through the press. ${insideClicks.toLocaleString()} clicks × $${clickCharge.toFixed(2)} per click = $${insideClickCost.toFixed(2)}.`
      },
      {
        number: 7,
        formula: "cover sheets = quantity (one folded sheet = one cover)",
        explanation: `Each booklet uses 1 folded sheet for the 4-page cover. ${numQty.toLocaleString()} booklets = ${coverSheets.toLocaleString()} cover sheets.`
      },
      {
        number: 8,
        formula: "Coverpaper cost = sheets × (cost per 1,000 sheets ÷ 1,000)",
        explanation: `Cover: ${coverPaperName} costs $${coverCostPerM.toFixed(2)} per 1,000 sheets, which is $${coverCostPerSheet.toFixed(2)} per sheet. ${coverSheets.toLocaleString()} sheets × $${coverCostPerSheet.toFixed(2)} = $${coverPaperCost.toFixed(2)}.`
      },
      {
        number: 9,
        formula: "Coverclick cost = clicks × price per click",
        explanation: `Cover: 2 sides printed per cover sheet (${coverClicks.toLocaleString()} clicks) × $${clickCharge.toFixed(2)} per click = $${coverClickCost.toFixed(2)}.`
      },
      {
        number: 10,
        formula: "cost = paper cost + click cost",
        explanation: `Add total paper and printing costs together: $${totalPaperCost.toFixed(2)} paper ($${insidePaperCost.toFixed(2)} inside + $${coverPaperCost.toFixed(2)} cover) + $${totalClickCost.toFixed(2)} clicks ($${insideClickCost.toFixed(2)} inside + $${coverClickCost.toFixed(2)} cover) = $${totalCost.toFixed(2)} total cost. That's what the job costs us to make — no profit yet.`
      },
      {
        number: 11,
        formula: "price = setup fee + ( cost × markup )",
        explanation: `We add a flat $${setupFee.toFixed(2)} setup fee for the job, then multiply the cost by our standard markup of ${markupMultiplier}×. $${setupFee.toFixed(2)} + ($${totalCost.toFixed(2)} × ${markupMultiplier}) = $${(setupFee + markupCost).toFixed(2)}.${extraUpcharges > 0 ? ` Additional options: +$${extraUpcharges.toFixed(2)}.` : ""} That's the price charged to the customer.`
      }
    ] : [
      {
        number: 1,
        formula: "pages per sheet = imposition × 2",
        explanation: `Every sheet is printed on both sides, so imposition ${imposition} × 2 = ${pagesPerSheet} pages fit on one sheet.`
      },
      {
        number: 2,
        formula: "inside pages = total pages, or total pages - 4 if there is a separate cover",
        explanation: `The cover is part of these same pages, so all ${totalPages} pages count as inside pages.`
      },
      {
        number: 3,
        formula: "sheets per booklet = round up ( inside pages ÷ pages per sheet )",
        explanation: `${insidePages} ÷ ${pagesPerSheet} = ${(insidePages / pagesPerSheet).toFixed(2)}, rounded up to ${sheetsPerBooklet} sheet(s) per booklet.`
      },
      {
        number: 4,
        formula: "inside sheets total = sheets per booklet × quantity",
        explanation: `${sheetsPerBooklet} × ${numQty.toLocaleString()} booklets = ${insideSheetsTotal.toLocaleString()} sheets.`
      },
      {
        number: 5,
        formula: "Inside pagespaper cost = sheets × (cost per 1,000 sheets ÷ 1,000)",
        explanation: `Inside pages: ${paperName} costs $${paperCostPerM.toFixed(2)} per 1,000 sheets, which is $${insideCostPerSheet.toFixed(2)} per sheet. ${insideSheetsTotal.toLocaleString()} sheets × $${insideCostPerSheet.toFixed(2)} = $${insidePaperCost.toFixed(2)}.`
      },
      {
        number: 6,
        formula: "Inside pagesclick cost = clicks × price per click",
        explanation: `Inside pages: a "click" is one pass of one side of one sheet through the press. ${insideClicks.toLocaleString()} clicks × $${clickCharge.toFixed(2)} per click = $${insideClickCost.toFixed(2)}.`
      },
      {
        number: 7,
        formula: "cost = paper cost + click cost",
        explanation: `Add the paper and printing costs together: $${insidePaperCost.toFixed(2)} paper + $${insideClickCost.toFixed(2)} clicks = $${totalCost.toFixed(2)} total cost. That's what the job costs us to make — no profit yet.`
      },
      {
        number: 8,
        formula: "price = setup fee + ( cost × markup )",
        explanation: `We add a flat $${setupFee.toFixed(2)} setup fee for the job, then multiply the cost by our standard markup of ${markupMultiplier}×. $${setupFee.toFixed(2)} + ($${totalCost.toFixed(2)} × ${markupMultiplier}) = $${(setupFee + markupCost).toFixed(2)}.${extraUpcharges > 0 ? ` Additional options: +$${extraUpcharges.toFixed(2)}.` : ""} That's the price charged to the customer.`
      }
    ];

    return {
      isPages: true,
      quantity: numQty,
      totalPages,
      hasSeparateCover: separateCoverChosen,
      imposition,
      pagesPerSheet,
      insidePages,
      sheetsPerBooklet,
      insideSheetsTotal,
      coverSheets,
      coverSheetsTotal: coverSheets,
      coverPaperName,
      coverCostPerM,
      paperName,
      paperCostPerM,
      insidePaperCost: Math.round(insidePaperCost * 100) / 100,
      insideClicks,
      insideClickCost: Math.round(insideClickCost * 100) / 100,
      coverPaperCost: Math.round(coverPaperCost * 100) / 100,
      coverClicks,
      coverClickCost: Math.round(coverClickCost * 100) / 100,
      totalPaperCost: Math.round(totalPaperCost * 100) / 100,
      totalClickCost: Math.round(totalClickCost * 100) / 100,
      paperCost: Math.round(totalPaperCost * 100) / 100,
      clickCost: Math.round(totalClickCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      setupFee,
      basePrice: setupFee,
      markupMultiplier,
      markupCost: Math.round(markupCost * 100) / 100,
      additionalUpcharges: extraUpcharges,
      finalPrice,
      unitPrice,
      steps,
      breakdown: {
        formula: `Price = Setup ($${setupFee.toFixed(2)}) + [Cost ($${totalCost.toFixed(2)}) × Markup (${markupMultiplier}x)]`,
        steps
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STANDARD FLAT PRODUCTS (SIDES FORMULA)
  // ─────────────────────────────────────────────────────────────────────────────
  let sides = 1;
  if (typeof sidesPages === "object" && sidesPages !== null) {
    sides = sidesPages.value ? parseFloat(sidesPages.value) : parseSidesOrPages(sidesPages.name || sidesPages.label);
  } else {
    sides = parseSidesOrPages(sidesPages);
  }
  sides = Math.max(1, sides);

  // Step 1: sheets needed = round up ( quantity ÷ imposition )
  const sheetsNeeded = Math.max(1, Math.ceil(numQty / imposition));

  // Step 2: clicks = sheets × sides
  const clicks = sheetsNeeded * sides;

  // Step 3: paper cost = sheets × (cost per 1,000 sheets ÷ 1,000)
  const paperCostPerSheet = paperCostPerM / 1000;
  const paperCost = sheetsNeeded * paperCostPerSheet;

  // Step 4: click cost = clicks × price per click
  const clickCost = clicks * clickCharge;

  // Step 5: cost = paper cost + click cost
  const totalCost = paperCost + clickCost;

  // Step 6: price = setup fee + ( cost × markup )
  const markupCost = totalCost * markupMultiplier;
  const calculatedPrice = setupFee + markupCost + extraUpcharges;
  const finalPrice = Math.round(calculatedPrice * 100) / 100;
  const unitPrice = Math.round((finalPrice / numQty) * 100) / 100;

  const sidesText = sides === 2 ? "both sides (2 sides)" : sides === 1 ? "one side (1 side)" : `${sides} sides`;

  const steps = [
    {
      number: 1,
      formula: "sheets needed = round up ( quantity ÷ imposition )",
      explanation: `"Imposition" is how many finished pieces fit on one full sheet of paper — here, ${imposition}. You asked for ${numQty.toLocaleString()} pieces, so ${numQty.toLocaleString()} ÷ ${imposition} = ${(numQty / imposition).toFixed(2)}, rounded UP (you can't print a part of a sheet) to ${sheetsNeeded.toLocaleString()} sheets.`
    },
    {
      number: 2,
      formula: "clicks = sheets × sides",
      explanation: `This is printed on ${sidesText}, so ${sheetsNeeded.toLocaleString()} sheets × ${sides} = ${clicks.toLocaleString()} clicks.`
    },
    {
      number: 3,
      formula: "paper cost = sheets × (cost per 1,000 sheets ÷ 1,000)",
      explanation: `${paperName} costs $${paperCostPerM.toFixed(2)} per 1,000 sheets, which is $${paperCostPerSheet.toFixed(2)} per sheet. ${sheetsNeeded.toLocaleString()} sheets × $${paperCostPerSheet.toFixed(2)} = $${paperCost.toFixed(2)}.`
    },
    {
      number: 4,
      formula: "click cost = clicks × price per click",
      explanation: `a "click" is one pass of one side of one sheet through the press. ${clicks.toLocaleString()} clicks × $${clickCharge.toFixed(2)} per click = $${clickCost.toFixed(2)}.`
    },
    {
      number: 5,
      formula: "cost = paper cost + click cost",
      explanation: `Add the paper and printing costs together: $${paperCost.toFixed(2)} paper + $${clickCost.toFixed(2)} clicks = $${totalCost.toFixed(2)} total cost. That's what the job costs us to make — no profit yet.`
    },
    {
      number: 6,
      formula: "price = setup fee + ( cost × markup )",
      explanation: `We add a flat $${setupFee.toFixed(2)} setup fee for the job, then multiply the cost by our standard markup of ${markupMultiplier}×. $${setupFee.toFixed(2)} + ($${totalCost.toFixed(2)} × ${markupMultiplier}) = $${(setupFee + markupCost).toFixed(2)}.${extraUpcharges > 0 ? ` Additional options: +$${extraUpcharges.toFixed(2)}.` : ""} That's the price charged to the customer.`
    }
  ];

  return {
    isPages: false,
    quantity: numQty,
    imposition,
    sides,
    sheetsNeeded,
    clicks,
    paperName,
    paperCostPerM,
    paperCost: Math.round(paperCost * 100) / 100,
    clickCharge,
    clickCost: Math.round(clickCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    setupFee,
    basePrice: setupFee,
    markupMultiplier,
    markupCost: Math.round(markupCost * 100) / 100,
    additionalUpcharges: extraUpcharges,
    finalPrice,
    unitPrice,
    steps,
    breakdown: {
      formula: `Price = Setup ($${setupFee.toFixed(2)}) + [Cost ($${totalCost.toFixed(2)}) × Markup (${markupMultiplier}x)]`,
      steps
    }
  };
}
