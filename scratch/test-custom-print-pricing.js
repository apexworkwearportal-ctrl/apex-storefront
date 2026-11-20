import { calculateCustomPrintPrice } from "../lib/custom-print-pricing.js";

// Test: Booklet with Cover
const bookletCoverJob = calculateCustomPrintPrice({
  quantity: 100,
  size: { name: 'Booklet 8.5" x 11"', imposition: 1, costPerM: 67.50, paperName: "100lb Gloss Text" },
  sidesPages: "16 Pages",
  sidesPagesType: "pages",
  hasSeparateCover: true,
  coverPaper: { name: "100lb Gloss Cover", imposition: 1, costPerM: 125.25 },
  basePrice: 70.00,
  settings: {
    colorClickCharge: 0.05,
    markupMultiplier: 3.0
  }
});

console.log("=== Booklet 100 qty, 16 pages with Cover ===");
console.log("Final Price:", bookletCoverJob.finalPrice);
console.log("Steps:");
bookletCoverJob.steps.forEach(s => {
  console.log(`${s.number}. ${s.formula}`);
  console.log(`   ${s.explanation}`);
});
