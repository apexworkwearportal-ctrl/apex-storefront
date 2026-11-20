import { calculateCustomPrintPrice } from "../lib/custom-print-pricing.js";

// Test Case 1: Screenshot 1 (500 qty, 2 imp, 2 sides, 100lb Gloss Text $67.50, click $0.05 (or $0.045), setup $70, markup 3x)
const flatJob500 = calculateCustomPrintPrice({
  quantity: 500,
  size: { name: '8.5" x 11"', imposition: 2, costPerM: 67.50, paperName: "100lb Gloss Text" },
  sidesPages: 2,
  basePrice: 70.00,
  settings: {
    colorClickCharge: 0.045, // 500 * 0.045 = 22.50
    markupMultiplier: 3.0
  }
});
console.log("=== Flat Job 500 ===");
console.log("Final Price:", flatJob500.finalPrice);
console.log("Steps:", JSON.stringify(flatJob500.steps, null, 2));

// Test Case 2: Screenshot 4 (1000 qty, 2 imp, 2 sides, 100lb Gloss Text $67.50, click $0.045, setup $70, markup 3x)
const flatJob1000 = calculateCustomPrintPrice({
  quantity: 1000,
  size: { name: '8.5" x 11"', imposition: 2, costPerM: 67.50, paperName: "100lb Gloss Text" },
  sidesPages: 2,
  basePrice: 70.00,
  settings: {
    colorClickCharge: 0.045,
    markupMultiplier: 3.0
  }
});
console.log("\n=== Flat Job 1000 ===");
console.log("Final Price:", flatJob1000.finalPrice);

// Test Case 3: Screenshot 5 (100 booklets, 8 pages, 1 imp, 80lb Gloss Cover $125.25, click $0.045, setup $70, markup 3x, self-cover)
const bookletJob = calculateCustomPrintPrice({
  quantity: 100,
  size: { name: 'Booklet 8.5" x 11"', imposition: 1, costPerM: 125.25, paperName: "80lb Gloss Cover" },
  sidesPages: "8 Pages",
  sidesPagesType: "pages",
  hasSeparateCover: false,
  basePrice: 70.00,
  settings: {
    colorClickCharge: 0.045, // 800 * 0.045 = 36.00
    markupMultiplier: 3.0
  }
});
console.log("\n=== Booklet Job 100 qty, 8 pages ===");
console.log("Final Price:", bookletJob.finalPrice);
console.log("Steps:", JSON.stringify(bookletJob.steps, null, 2));

// Test Case 4: Booklet with Separate Cover
const bookletSeparateCover = calculateCustomPrintPrice({
  quantity: 100,
  size: { name: 'Booklet 8.5" x 11"', imposition: 1, costPerM: 67.50, paperName: "100lb Gloss Text" },
  sidesPages: "16 Pages",
  sidesPagesType: "pages",
  hasSeparateCover: true,
  coverPaper: { name: "100lb Gloss Cover", costPerM: 125.25 },
  basePrice: 70.00,
  settings: {
    colorClickCharge: 0.05,
    markupMultiplier: 3.0
  }
});
console.log("\n=== Booklet Job 16 pages Separate Cover ===");
console.log("Final Price:", bookletSeparateCover.finalPrice);
