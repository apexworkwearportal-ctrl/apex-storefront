import { adminDb } from "@/lib/firebase-admin";
import { placeOrder } from "@/lib/sinalite";
import { sendOrderConfirmationEmail } from "@/lib/emails";
import { splitOrderIfNeeded } from "@/lib/order-splitter";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const sessionId = searchParams.get("session_id");

    if (!orderId && !sessionId) {
      return Response.json({ error: "Missing orderId or session_id" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const targetId = orderId || sessionId;

    // 1. Check if order or split order already exists in "orders" collection
    const orderSnap = await adminDb.collection("orders").doc(targetId).get();
    if (orderSnap.exists) {
      return Response.json({ success: true, order: { id: orderSnap.id, ...orderSnap.data() } });
    }

    // Check if split print order exists
    const printSnap = await adminDb.collection("orders").doc(`${targetId}-PRINT`).get();
    if (printSnap.exists) {
      return Response.json({ success: true, order: { id: printSnap.id, ...printSnap.data() } });
    }

    // 2. Check if order exists in "pendingOrders" collection
    const pendingSnap = await adminDb.collection("pendingOrders").doc(targetId).get();
    if (pendingSnap.exists) {
      const pendingData = pendingSnap.data();

      const baseOrder = {
        ...pendingData,
        id: targetId,
        paymentStatus: "paid",
        stripeSessionId: sessionId || pendingData.stripeSessionId || null,
        confirmedAt: new Date()
      };

      // Split into Print (SinaLite) & Apparel (Admin Internal) orders if mixed
      const splitOrders = splitOrderIfNeeded(baseOrder);

      const confirmedList = [];

      for (const ord of splitOrders) {
        let sinaliteOrderId = null;

        // If Print order, attempt automatic submission to SinaLite API
        if (ord.fulfillmentType === "sinalite") {
          try {
            const sinaliteRes = await placeOrder(ord.shippingAddress, ord.items);
            if (sinaliteRes && sinaliteRes.orderId) {
              sinaliteOrderId = sinaliteRes.orderId;
            }
          } catch (err) {
            console.error("SinaLite order placement failed for split order:", err.message);
          }
        }

        const finalizedDoc = {
          ...ord,
          status: ord.fulfillmentType === "sinalite" ? (sinaliteOrderId ? "submitted" : "submitted") : "pending_apparel_fulfillment",
          sinaliteOrderId
        };

        await adminDb.collection("orders").doc(finalizedDoc.id).set(finalizedDoc);
        confirmedList.push(finalizedDoc);

        try {
          await sendOrderConfirmationEmail(finalizedDoc);
        } catch (emailErr) {
          console.error("Email sending failed during confirmation:", emailErr.message);
        }
      }

      // Remove from "pendingOrders"
      try {
        await adminDb.collection("pendingOrders").doc(targetId).delete();
      } catch (delErr) {
        console.warn("Could not delete pending order ref:", delErr.message);
      }

      return Response.json({ success: true, orders: confirmedList, order: confirmedList[0] });
    }

    return Response.json({ success: false, error: "Order not found" }, { status: 404 });
  } catch (err) {
    console.error("GET Checkout Confirm Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
