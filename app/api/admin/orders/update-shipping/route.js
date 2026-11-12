import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/admin/orders/update-shipping
 * Updates shipping method and recalculates admin shipping expense variance.
 * Customer total and customer-facing view are strictly preserved.
 * No email notification is sent to the customer.
 */
export async function POST(req) {
  try {
    const { orderId, newShippingMethod, newShippingPrice, updatedAddress } = await req.json();

    if (!orderId || !newShippingMethod) {
      return Response.json({ error: "Missing required order ID or new shipping method" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const ord = orderDoc.data();

    // Verify order is not already submitted to SinaLite
    if (ord.sinaliteOrderId) {
      return Response.json({
        error: `Order is already transmitted to SinaLite (Ref #${ord.sinaliteOrderId}). Shipping cannot be modified.`
      }, { status: 400 });
    }

    const customerChargedShipping = parseFloat(
      ord.originalShippingCharged !== undefined 
        ? ord.originalShippingCharged 
        : (ord.totals?.shipping || 0)
    );

    const actualNewShippingCost = parseFloat(newShippingPrice || 0);

    // If new shipping is higher than what customer paid, difference is an admin expense
    const shippingExpenseVariance = Math.max(0, actualNewShippingCost - customerChargedShipping);

    // Prepare updated shipping address object
    const currentAddr = ord.shippingAddress || {};
    const mergedAddress = {
      ...currentAddr,
      ...(updatedAddress || {}),
      ShipMethod: newShippingMethod,
    };

    const updatePayload = {
      shippingMethod: newShippingMethod,
      shippingAddress: mergedAddress,
      // Record original shipping charged to customer permanently
      originalShippingCharged: customerChargedShipping,
      // Record updated actual shipping cost
      actualShippingCost: actualNewShippingCost,
      // Admin absorbs difference as store expense
      adminShippingExpense: shippingExpenseVariance,
      shippingModifiedByAdmin: true,
      shippingModifiedAt: new Date().toISOString()
    };

    await orderRef.update(updatePayload);

    return Response.json({
      success: true,
      message: `Shipping method updated to "${newShippingMethod}".`,
      order: {
        ...ord,
        ...updatePayload
      }
    });
  } catch (error) {
    console.error("[Admin Update Shipping Error]:", error);
    return Response.json({ error: error.message || "Failed to update shipping method." }, { status: 500 });
  }
}

