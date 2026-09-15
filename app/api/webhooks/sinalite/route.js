import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const payload = await req.json();
    console.log("SinaLite Webhook Received:", JSON.stringify(payload, null, 2));

    const sinaliteOrderId = payload.order_id ? String(payload.order_id) : null;
    const orderStatus = payload.status || "UPDATED";
    const trackingNumber = payload.shipping || "";
    const itemsPayload = payload.items || [];
    const notes = payload.notes || "";

    if (!sinaliteOrderId) {
      return Response.json({ error: "Missing order_id in webhook payload" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    // 1. Search for matching order in "orders" collection
    let targetDocRef = null;
    let existingOrderData = null;

    // Search by document ID or sinaliteOrderId field
    const directDoc = await adminDb.collection("orders").doc(sinaliteOrderId).get();
    if (directDoc.exists) {
      targetDocRef = directDoc.ref;
      existingOrderData = directDoc.data();
    } else {
      const querySnap = await adminDb.collection("orders")
        .where("sinaliteOrderId", "==", sinaliteOrderId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const matchingDoc = querySnap.docs[0];
        targetDocRef = matchingDoc.ref;
        existingOrderData = matchingDoc.data();
      } else {
        // Fallback: search pendingOrders
        const pendingSnap = await adminDb.collection("pendingOrders")
          .where("sinaliteOrderId", "==", sinaliteOrderId)
          .limit(1)
          .get();

        if (!pendingSnap.empty) {
          const matchingDoc = pendingSnap.docs[0];
          targetDocRef = matchingDoc.ref;
          existingOrderData = matchingDoc.data();
        }
      }
    }

    if (!targetDocRef || !existingOrderData) {
      console.warn(`SinaLite Webhook: No matching order found for order_id: ${sinaliteOrderId}`);
      return Response.json({
        received: true,
        matched: false,
        message: `No order record found matching SinaLite Order ID ${sinaliteOrderId}`
      }, { status: 200 });
    }

    // Extract first available reviewURL & reviewFILE from items payload
    let mainReviewUrl = null;
    let mainReviewFile = null;

    itemsPayload.forEach(item => {
      if (item.reviewURL && !mainReviewUrl) mainReviewUrl = item.reviewURL;
      if (item.reviewFILE && !mainReviewFile) mainReviewFile = item.reviewFILE;
    });

    // Merge review details into order items
    const updatedItems = (existingOrderData.items || []).map((orderItem, idx) => {
      const match = itemsPayload[idx] || itemsPayload.find(i => String(i.item_id) === String(orderItem.sinaliteItemId));
      if (match) {
        return {
          ...orderItem,
          sinaliteItemId: match.item_id,
          sinaliteItemStatus: match.status,
          reviewURL: match.reviewURL || orderItem.reviewURL || null,
          reviewFILE: match.reviewFILE || orderItem.reviewFILE || null,
          extra: match.extra || orderItem.extra || ""
        };
      }
      return orderItem;
    });

    // Determine overall order status update
    let newStatus = existingOrderData.status;
    if (orderStatus.toUpperCase() === "SHIPPED") {
      newStatus = "shipped";
    } else if (mainReviewUrl && existingOrderData.sinaliteProofStatus !== "approved") {
      newStatus = "proof_ready";
    }

    const updatePayload = {
      sinaliteOrderId,
      sinaliteStatus: orderStatus,
      sinaliteTrackingNumber: trackingNumber || existingOrderData.sinaliteTrackingNumber || "",
      sinaliteNotes: notes,
      sinaliteLastUpdated: new Date(),
      sinaliteWebhookRaw: payload,
      items: updatedItems,
      status: newStatus
    };

    if (mainReviewUrl) {
      updatePayload.sinaliteReviewURL = mainReviewUrl;
      updatePayload.sinaliteReviewFILE = mainReviewFile;
      if (!existingOrderData.sinaliteProofStatus) {
        updatePayload.sinaliteProofStatus = "review_required";
      }
    }

    await targetDocRef.update(updatePayload);

    console.log(`SinaLite Webhook processed successfully for Order ${targetDocRef.id}`);

    return Response.json({
      received: true,
      matched: true,
      orderId: targetDocRef.id,
      status: newStatus,
      hasReviewURL: Boolean(mainReviewUrl)
    });

  } catch (err) {
    console.error("SinaLite Webhook Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
