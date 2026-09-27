import { adminDb } from "@/lib/firebase-admin";

/**
 * Default Sitewise Fallback Markup Configuration
 */
export const DEFAULT_SITEWISE_SETTINGS = {
  globalMarkupType: "percentage", // "percentage" or "tiers"
  defaultMarkupPercent: 30, // 30% default markup over base cost
  markupPercent: 30,
  defaultSetupCharge: 0,
  setupCharge: 0,
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
      const data = snap.data();
      const markupPercent = data.defaultMarkupPercent !== undefined ? parseFloat(data.defaultMarkupPercent) : (data.markupPercent !== undefined ? parseFloat(data.markupPercent) : 30);
      return {
        ...DEFAULT_SITEWISE_SETTINGS,
        ...data,
        defaultMarkupPercent: markupPercent,
        markupPercent: markupPercent
      };
    }
  } catch (err) {
    console.warn("Failed to fetch sitewise pricing settings, using defaults:", err);
  }
  return DEFAULT_SITEWISE_SETTINGS;
}

/**
 * Calculate Selling Price based on Base Cost, Quantity, and hierarchy:
 * Product Override -> Category Override (or Parent Category Override) -> Sitewise Default
 */
export function calculateSellingPrice({ baseCost, quantity = 1, product = null, category = null, parentCategory = null, sitewiseSettings = DEFAULT_SITEWISE_SETTINGS }) {
  const numBaseCost = parseFloat(baseCost) || 0;
  const numQty = parseInt(quantity) || 1;
  const setupCharge = parseFloat(sitewiseSettings?.defaultSetupCharge || sitewiseSettings?.setupCharge || 0);

  // 1. Check Product-Level Override
  if (product && product.useCustomMarkup) {
    return applyMarkupRule(numBaseCost, numQty, setupCharge, product);
  }

  // 2. Check Category-Level Override
  if (category && category.useCustomMarkup) {
    return applyMarkupRule(numBaseCost, numQty, category.setupCharge || setupCharge, category);
  }

  // 2b. Check Parent Category Override if subcategory doesn't have custom markup
  if (parentCategory && parentCategory.useCustomMarkup) {
    return applyMarkupRule(numBaseCost, numQty, parentCategory.setupCharge || setupCharge, parentCategory);
  }

  // 3. Fallback to Sitewise Default
  return applyMarkupRule(numBaseCost, numQty, setupCharge, sitewiseSettings);
}

export function applyMarkupRule(baseCost, quantity, setupCharge = 0, ruleObj = {}) {
  let markupPercent = 30;

  // Prioritize explicit markupPercent or defaultMarkupPercent
  if (ruleObj.defaultMarkupPercent !== undefined && ruleObj.defaultMarkupPercent !== null && !isNaN(parseFloat(ruleObj.defaultMarkupPercent))) {
    markupPercent = parseFloat(ruleObj.defaultMarkupPercent);
  } else if (ruleObj.markupPercent !== undefined && ruleObj.markupPercent !== null && !isNaN(parseFloat(ruleObj.markupPercent))) {
    markupPercent = parseFloat(ruleObj.markupPercent);
  }

  if (isNaN(markupPercent)) {
    markupPercent = 30;
  }

  const markupType = ruleObj.globalMarkupType || ruleObj.markupType || "percentage";

  if (markupType === "tiers") {
    const tiers = ruleObj.quantityTiers || [];
    const matchedTier = tiers.find(t => quantity >= parseInt(t.minQty) && quantity <= parseInt(t.maxQty));
    if (matchedTier && matchedTier.markupPercent !== undefined && matchedTier.markupPercent !== null) {
      markupPercent = parseFloat(matchedTier.markupPercent);
    }
  }

  const numSetupCharge = parseFloat(ruleObj.setupCharge || setupCharge || 0);
  const markupAmount = baseCost * (markupPercent / 100);
  const finalPrice = Math.round((baseCost + markupAmount + numSetupCharge) * 100) / 100;

  return {
    rawBaseCost: baseCost,
    markupPercent,
    markupAmount: Math.round(markupAmount * 100) / 100,
    setupCharge: numSetupCharge,
    finalPrice,
    price: finalPrice // alias for API compatibility
  };
}
