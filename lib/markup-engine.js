import { adminDb } from "@/lib/firebase-admin";

/**
 * Default Sitewise Fallback Markup Configuration
 */
export const DEFAULT_SITEWISE_SETTINGS = {
  globalMarkupType: "percentage", // "percentage" or "tiers"
  defaultMarkupPercent: 30, // 30% markup over base cost
  defaultSetupCharge: 0,
  quantityTiers: [
    { minQty: 1, maxQty: 25, markupPercent: 45 },
    { minQty: 26, maxQty: 100, markupPercent: 35 },
    { minQty: 101, maxQty: 500, markupPercent: 25 },
    { minQty: 501, maxQty: 99999, markupPercent: 20 }
  ]
};

/**
 * Fetch global Sitewise pricing settings from Firestore
 */
export async function getSitewisePricingSettings() {
  if (!adminDb) return DEFAULT_SITEWISE_SETTINGS;

  try {
    const docRef = adminDb.collection("settings").doc("pricing");
    const snap = await docRef.get();
    if (snap.exists) {
      return { ...DEFAULT_SITEWISE_SETTINGS, ...snap.data() };
    }
  } catch (err) {
    console.warn("Failed to fetch sitewise pricing settings, using defaults:", err);
  }
  return DEFAULT_SITEWISE_SETTINGS;
}

/**
 * Calculate Selling Price based on Base Cost, Quantity, and hierarchy (Product -> Category -> Sitewise)
 */
export function calculateSellingPrice({ baseCost, quantity = 1, product = null, category = null, sitewiseSettings = DEFAULT_SITEWISE_SETTINGS }) {
  const numBaseCost = parseFloat(baseCost) || 0;
  const numQty = parseInt(quantity) || 1;
  const setupCharge = parseFloat(sitewiseSettings?.defaultSetupCharge || 0);

  // 1. Check Product-Level Override
  if (product && product.useCustomMarkup) {
    return applyMarkupRule(numBaseCost, numQty, setupCharge, product);
  }

  // 2. Check Category-Level Override
  if (category && category.useCustomMarkup) {
    return applyMarkupRule(numBaseCost, numQty, setupCharge, category);
  }

  // 3. Fallback to Sitewise Default
  return applyMarkupRule(numBaseCost, numQty, setupCharge, sitewiseSettings);
}

function applyMarkupRule(baseCost, quantity, setupCharge, ruleObj) {
  let markupPercent = 30;
  if (ruleObj.markupPercent !== undefined && ruleObj.markupPercent !== null) {
    markupPercent = parseFloat(ruleObj.markupPercent);
  } else if (ruleObj.defaultMarkupPercent !== undefined && ruleObj.defaultMarkupPercent !== null) {
    markupPercent = parseFloat(ruleObj.defaultMarkupPercent);
  }

  if (isNaN(markupPercent)) {
    markupPercent = 30;
  }

  if (ruleObj.globalMarkupType === "tiers" || ruleObj.markupType === "tiers") {
    const tiers = ruleObj.quantityTiers || [];
    const matchedTier = tiers.find(t => quantity >= parseInt(t.minQty) && quantity <= parseInt(t.maxQty));
    if (matchedTier && matchedTier.markupPercent !== undefined && matchedTier.markupPercent !== null) {
      markupPercent = parseFloat(matchedTier.markupPercent);
    }
  }

  const markupAmount = baseCost * (markupPercent / 100);
  const finalPrice = Math.round((baseCost + markupAmount + setupCharge) * 100) / 100;

  return {
    rawBaseCost: baseCost,
    markupPercent,
    markupAmount: Math.round(markupAmount * 100) / 100,
    setupCharge,
    finalPrice,
    price: finalPrice // alias for API compatibility
  };
}
