import { getCustomPrintSettings } from "@/lib/custom-print-pricing-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCustomPrintSettings();
    return Response.json(settings);
  } catch (err) {
    console.error("GET custom print settings error:", err);
    return Response.json({
      colorClickCharge: 0.045,
      grayscaleClickCharge: 0.01,
      markupMultiplier: 3.0
    });
  }
}
