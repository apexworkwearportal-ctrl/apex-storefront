import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const snap = await adminDb.collection("settings").doc("customShipping").get();
    if (!snap.exists) {
      // Default initial custom print in-house shipping classes
      return Response.json({
        classes: [
          { id: "std-custom-print", name: "Standard In-House Print Shipping", basePrice: 14.99, perItemPrice: 2.00, deliveryDays: "4-6 days", active: true },
          { id: "exp-custom-print", name: "Express In-House Print Shipping", basePrice: 24.99, perItemPrice: 3.50, deliveryDays: "2-3 days", active: true },
          { id: "rush-custom-print", name: "Rush Production & Courier", basePrice: 39.99, perItemPrice: 5.00, deliveryDays: "1-2 days", active: true }
        ]
      });
    }

    return Response.json(snap.data());
  } catch (err) {
    console.error("GET Custom Print Shipping Error:", err);
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

    await adminDb.collection("settings").doc("customShipping").set({
      classes,
      updatedAt: new Date()
    }, { merge: true });

    return Response.json({
      success: true,
      message: "Custom Print Shipping Classes saved successfully!"
    });
  } catch (err) {
    console.error("POST Custom Print Shipping Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
