import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_CUSTOM_PRINT_SETTINGS } from "@/lib/custom-print-pricing";
import { getCustomPrintSettings } from "@/lib/custom-print-pricing-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCustomPrintSettings();
    return Response.json(settings);
  } catch (err) {
    console.error("GET custom print settings error:", err);
    return Response.json({ error: "Failed to load custom print settings" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await req.json();
    const colorClickCharge = parseFloat(body.colorClickCharge) || DEFAULT_CUSTOM_PRINT_SETTINGS.colorClickCharge;
    const grayscaleClickCharge = parseFloat(body.grayscaleClickCharge) || DEFAULT_CUSTOM_PRINT_SETTINGS.grayscaleClickCharge;
    const markupMultiplier = parseFloat(body.markupMultiplier) || DEFAULT_CUSTOM_PRINT_SETTINGS.markupMultiplier;

    const payload = {
      colorClickCharge,
      grayscaleClickCharge,
      markupMultiplier,
      updatedAt: new Date()
    };

    await adminDb.collection("settings").doc("customPrint").set(payload, { merge: true });

    return Response.json({
      success: true,
      message: "Custom print pricing settings updated successfully!",
      settings: payload
    });
  } catch (err) {
    console.error("POST custom print settings error:", err);
    return Response.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}
