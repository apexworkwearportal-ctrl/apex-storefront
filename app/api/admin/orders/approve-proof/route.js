import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { orderId, approvedBy } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    await orderRef.update({
      sinaliteProofStatus: "approved",
      status: "processing",
      proofApprovedAt: new Date(),
      proofApprovedBy: approvedBy || "admin"
    });

    return Response.json({
      success: true,
      message: `Proof approved successfully for Order ${orderId}. Order is now officially placed into production!`
    });
  } catch (err) {
    console.error("Approve Proof Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
