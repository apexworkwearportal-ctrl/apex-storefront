import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_CUSTOM_PRINT_SETTINGS } from "./custom-print-pricing";

/**
 * Server-side helper to load custom print pricing settings from Firestore
 */
export async function getCustomPrintSettings() {
  if (!adminDb) return { ...DEFAULT_CUSTOM_PRINT_SETTINGS };

  try {
    const snap = await adminDb.collection("settings").doc("customPrint").get();
    if (snap.exists) {
      const data = snap.data();
      return {
        colorClickCharge: data.colorClickCharge !== undefined ? parseFloat(data.colorClickCharge) : DEFAULT_CUSTOM_PRINT_SETTINGS.colorClickCharge,
        grayscaleClickCharge: data.grayscaleClickCharge !== undefined ? parseFloat(data.grayscaleClickCharge) : DEFAULT_CUSTOM_PRINT_SETTINGS.grayscaleClickCharge,
        markupMultiplier: data.markupMultiplier !== undefined ? parseFloat(data.markupMultiplier) : DEFAULT_CUSTOM_PRINT_SETTINGS.markupMultiplier
      };
    }
  } catch (err) {
    console.warn("Failed to fetch custom print settings from Firestore, using defaults:", err.message);
  }

  return { ...DEFAULT_CUSTOM_PRINT_SETTINGS };
}
