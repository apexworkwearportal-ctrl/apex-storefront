import { calculateCustomPrintPrice } from "../lib/custom-print-pricing.js";

const testJob = calculateCustomPrintPrice({
  quantity: 500,
  size: { name: '8.5" x 11"', imposition: 2, costPerM: 40.00 },
  sidesPages: { name: "2 Sided", value: 2 },
  printMode: { name: "Colour", type: "color" },
  basePrice: 10.00,
  settings: {
    colorClickCharge: 0.08,
    grayscaleClickCharge: 0.02,
    markupMultiplier: 2.0
  }
});

console.log("Calculation Result:", JSON.stringify(testJob, null, 2));

const testBwJob = calculateCustomPrintPrice({
  quantity: 1000,
  size: { name: '11" x 17"', imposition: 1, costPerM: 75.00 },
  sidesPages: 1,
  printMode: "bw",
  basePrice: 15.00,
  settings: {
    colorClickCharge: 0.08,
    grayscaleClickCharge: 0.02,
    markupMultiplier: 2.0
  }
});

console.log("B&W Job Result:", JSON.stringify(testBwJob, null, 2));
