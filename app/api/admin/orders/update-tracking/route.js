import { adminDb } from "@/lib/firebase-admin";
import { sendOrderStatusUpdateEmail } from "@/lib/emails";

export async function POST(req) {
  try {
    const { orderId, carrier, trackingNumber, trackingUrl, notifyCustomer } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing order ID" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database unavailable" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const updates = {
      carrier: carrier ? carrier.trim() : null,
      trackingNumber: trackingNumber ? trackingNumber.trim() : null,
      shippingTrackingNumber: trackingNumber ? trackingNumber.trim() : null,
      trackingUrl: trackingUrl ? trackingUrl.trim() : null,
      updatedAt: new Date()
    };

    // If order was in production or submitted, setting tracking moves or confirms it as shipped
    if (trackingNumber || trackingUrl) {
      updates.status = "shipped";
    }

    await orderRef.update(updates);

    const updatedOrder = {
      id: orderDoc.id,
      ...orderDoc.data(),
      ...updates
    };

    // Send customer notification email if requested
    let emailResult = null;
    if (notifyCustomer) {
      try {
        emailResult = await sendOrderStatusUpdateEmail(
          updatedOrder,
          "shipped",
          updates.trackingNumber || "",
          updates.trackingUrl || ""
        );
      } catch (eErr) {
        console.warn("Could not send tracking update email:", eErr.message);
      }
    }

    return Response.json({
      success: true,
      order: updatedOrder,
      emailSent: !!emailResult?.success
    });
  } catch (error) {
    console.error("Error updating tracking info:", error);
    return Response.json({ error: error.message || "Failed to update tracking info" }, { status: 500 });
  }
}

