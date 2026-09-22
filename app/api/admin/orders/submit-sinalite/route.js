import { placeOrder } from "@/lib/sinalite";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return Response.json({ error: "Missing order ID" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const ord = orderDoc.data();

    // Prepare items array formatted for SinaLite API
    const sinaliteItems = (ord.items || [])
      .filter(item => !item.isCustom && !isNaN(parseInt(item.productId)))
      .map(item => {
        let optionsArr = [];
        if (Array.isArray(item.selectedOptionIds)) {
          optionsArr = item.selectedOptionIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        } else if (item.selectedOptionMap && typeof item.selectedOptionMap === "object") {
          optionsArr = Object.values(item.selectedOptionMap).map(id => parseInt(id)).filter(id => !isNaN(id));
        } else if (Array.isArray(item.options)) {
          optionsArr = item.options.map(id => parseInt(id)).filter(id => !isNaN(id));
        }

        const files = [];
        if (Array.isArray(item.artworkFiles)) {
          item.artworkFiles.forEach(f => { if (f.url) files.push(f.url); });
        } else if (item.artworkUrl) {
          files.push(item.artworkUrl);
        }

        return {
          productId: parseInt(item.productId),
          options: optionsArr,
          ...(files.length > 0 ? { files } : {})
        };
      });

    if (sinaliteItems.length === 0) {
      return Response.json({ error: "No print products eligible for SinaLite submission found in this order." }, { status: 400 });
    }

    const addr = ord.shippingAddress || {};
    const shippingInfo = {
      ShipName: addr.ShipName || addr.fullName || addr.name || "Customer",
      ShipCompany: addr.ShipCompany || addr.companyName || "",
      ShipAddress1: addr.ShipAddress1 || addr.address || "",
      ShipAddress2: addr.ShipAddress2 || addr.apartment || "",
      ShipCity: addr.ShipCity || addr.city || "",
      ShipState: addr.ShipState || addr.state || "ON",
      ShipZip: addr.ShipZip || addr.zip || "",
      ShipCountry: addr.ShipCountry || addr.country || "CA",
      ShipPhone: addr.ShipPhone || addr.phone || "4165550199"
    };

    const billingInfo = { ...shippingInfo };
    const notes = ord.notes || `Order ${orderId} submitted manually via Admin Panel`;

    console.log(`Submitting order ${orderId} to SinaLite with items:`, JSON.stringify(sinaliteItems));

    // Call placeOrder with CORRECT parameter sequence: (items, shippingInfo, billingInfo, notes)
    const sinaliteRes = await placeOrder(sinaliteItems, shippingInfo, billingInfo, notes);

    let sinaliteOrderId = null;
    if (sinaliteRes && (sinaliteRes.orderId || sinaliteRes.order_id || sinaliteRes.id)) {
      sinaliteOrderId = String(sinaliteRes.orderId || sinaliteRes.order_id || sinaliteRes.id);
    }

    if (!sinaliteOrderId) {
      return Response.json({ 
        error: "SinaLite API submission did not return an order ID.", 
        details: sinaliteRes 
      }, { status: 502 });
    }

    // Update order record in Firestore
    await adminDb.collection("orders").doc(orderId).update({
      sinaliteOrderId,
      status: "submitted",
      sinaliteStatus: "SUBMITTED",
      sinaliteSubmittedAt: new Date()
    });

    return Response.json({
      success: true,
      sinaliteOrderId,
      message: `Successfully transmitted order #${orderId} to SinaLite! Ref ID: ${sinaliteOrderId}`
    });

  } catch (err) {
    console.error("Manual SinaLite order placement error:", err);
    return Response.json({ error: err.message || "Failed to submit order to SinaLite." }, { status: 500 });
  }
}
