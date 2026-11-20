import { adminDb } from "@/lib/firebase-admin";
import { sendAbandonedCheckoutRecoveryEmail } from "@/lib/emails";

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const { orderId, isPendingCollection, templateId, discountCode, customSubject, customMessage } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Order ID is required" }, { status: 400 });
    }

    const collectionName = isPendingCollection ? "pendingOrders" : "orders";
    let docRef = adminDb.collection(collectionName).doc(orderId);
    let snap = await docRef.get();

    if (!snap.exists && !isPendingCollection) {
      docRef = adminDb.collection("pendingOrders").doc(orderId);
      snap = await docRef.get();
    }

    if (!snap.exists) {
      return Response.json({ error: "Order document not found" }, { status: 404 });
    }

    const orderData = { id: snap.id, ...snap.data() };

    const emailResult = await sendAbandonedCheckoutRecoveryEmail({
      order: orderData,
      templateId,
      discountCode,
      customSubject,
      customMessage
    });

    if (!emailResult.success) {
      return Response.json({ error: emailResult.error || "Failed to deliver email" }, { status: 500 });
    }

    // Record recovery email sent timestamp on document
    await docRef.set({
      recoveryEmailSentAt: new Date().toISOString(),
      recoveryEmailTemplate: templateId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return Response.json({
      success: true,
      orderId,
      templateId,
      mock: Boolean(emailResult.mock)
    });
  } catch (err) {
    console.error("Error sending recovery email:", err);
    return Response.json({ error: err.message || "Failed to send recovery email" }, { status: 500 });
  }
}

