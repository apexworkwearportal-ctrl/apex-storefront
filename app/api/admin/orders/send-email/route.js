import { adminDb } from "@/lib/firebase-admin";
import { sendOrderStatusUpdateEmail, sendCustomOrderEmail } from "@/lib/emails";

export async function POST(req) {
  try {
    const { orderId, type, statusText, trackingNumber, trackingUrl, subject, message } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing order ID" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() };

    let result;
    if (type === "status_update") {
      const statusToUse = statusText || orderData.status || "Updated";
      const tracking = trackingNumber || orderData.sinaliteTrackingNumber || orderData.trackingNumber || "";
      const trackUrl = trackingUrl || orderData.trackingUrl || "";
      result = await sendOrderStatusUpdateEmail(orderData, statusToUse, tracking, trackUrl);
    } else if (type === "custom") {
      if (!message || !message.trim()) {
        return Response.json({ error: "Message content is required" }, { status: 400 });
      }
      result = await sendCustomOrderEmail(orderData, subject, message);
    } else {
      return Response.json({ error: "Invalid email type specified" }, { status: 400 });
    }

    if (!result?.success) {
      return Response.json({ error: result?.error || "Failed to deliver email" }, { status: 500 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error("Error in admin order send-email:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

