import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const snap = await adminDb.collection("settings").doc("apparelShipping").get();
    if (!snap.exists) {
      // Default initial apparel shipping classes
      return Response.json({
        classes: [
          { id: "std-apparel", name: "Standard Apparel Shipping", basePrice: 9.99, perItemPrice: 1.50, deliveryDays: "5-7 days", active: true },
          { id: "exp-apparel", name: "Express Apparel Shipping", basePrice: 19.99, perItemPrice: 3.00, deliveryDays: "2-3 days", active: true },
          { id: "pickup-apparel", name: "Apparel Storefront Pickup", basePrice: 0.00, perItemPrice: 0.00, deliveryDays: "1-2 days", active: true }
        ]
      });
    }

    return Response.json(snap.data());
  } catch (err) {
    console.error("GET Apparel Shipping Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const { classes } = await req.json();

    if (!Array.isArray(classes)) {
      return Response.json({ error: "Invalid payload: classes must be an array" }, { status: 400 });
    }

    await adminDb.collection("settings").doc("apparelShipping").set({
      classes,
      updatedAt: new Date()
    }, { merge: true });

    return Response.json({
      success: true,
      message: "Custom Apparel Shipping Classes saved successfully!"
    });
  } catch (err) {
    console.error("POST Apparel Shipping Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
