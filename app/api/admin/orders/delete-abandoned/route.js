import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const { orderId, isPendingCollection } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Try deleting from pendingOrders first or orders based on flag
    let deletedFrom = null;

    if (isPendingCollection) {
      const docRef = adminDb.collection("pendingOrders").doc(orderId);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.delete();
        deletedFrom = "pendingOrders";
      }
    }

    if (!deletedFrom) {
      // Check orders collection
      const orderRef = adminDb.collection("orders").doc(orderId);
      const snap = await orderRef.get();
      if (snap.exists) {
        const data = snap.data();
        // Safety check: Only allow deleting if payment is pending / unpaid
        if (data.paymentStatus === "pending" || data.status === "payment_pending") {
          await orderRef.delete();
          deletedFrom = "orders";
        } else {
          return Response.json({ error: "Cannot delete a paid or fulfilled order." }, { status: 403 });
        }
      } else {
        // Try pendingOrders if not checked
        const pendingRef = adminDb.collection("pendingOrders").doc(orderId);
        const pSnap = await pendingRef.get();
        if (pSnap.exists) {
          await pendingRef.delete();
          deletedFrom = "pendingOrders";
        }
      }
    }

    if (!deletedFrom) {
      return Response.json({ error: "Order document not found" }, { status: 404 });
    }

    return Response.json({ success: true, orderId, deletedFrom });
  } catch (err) {
    console.error("Error deleting abandoned order:", err);
    return Response.json({ error: err.message || "Failed to delete order" }, { status: 500 });
  }
}

