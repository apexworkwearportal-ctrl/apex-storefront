import { placeOrder } from "@/lib/sinalite";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeCountryCode, normalizeStateCode } from "@/lib/location-data";

function formatSinaliteOrderPayload(ord) {
  // 1. Format Items
  const items = (ord.items || [])
    .filter(item => !item.isCustom && !isNaN(parseInt(item.productId)))
    .map(item => {
      let optionsObj = {};
      if (item.selectedOptionMap && typeof item.selectedOptionMap === "object") {
        Object.entries(item.selectedOptionMap).forEach(([gName, val]) => {
          optionsObj[gName] = String(val);
        });
      } else if (item.options && typeof item.options === "object" && !Array.isArray(item.options)) {
        optionsObj = { ...item.options };
      }

      const files = [];
      if (Array.isArray(item.artworkFiles) && item.artworkFiles.length > 0) {
        item.artworkFiles.forEach((f, fIdx) => {
          if (f.url) {
            files.push({
              type: f.side || (fIdx === 0 ? "front" : "back"),
              url: f.url
            });
          }
        });
      } else if (item.artworkUrl) {
        files.push({
          type: "front",
          url: item.artworkUrl
        });
      } else if (item.image) {
        files.push({
          type: "front",
          url: item.image
        });
      }

      return {
        productId: parseInt(item.productId),
        options: optionsObj,
        files: files
      };
    });

  // 2. Format Shipping Info
  const addr = ord.shippingAddress || {};
  const fullName = addr.ShipName || addr.fullName || addr.name || "Customer";
  const nameParts = fullName.trim().split(" ");
  const shipFName = addr.ShipFName || nameParts[0] || "Customer";
  const shipLName = addr.ShipLName || nameParts.slice(1).join(" ") || "Customer";

  const shipCountry = normalizeCountryCode(addr.ShipCountry || addr.country || "CA");
  const shipState = normalizeStateCode(addr.ShipState || addr.state || "ON", shipCountry);

  const shippingInfo = {
    ShipFName: shipFName,
    ShipLName: shipLName,
    ShipEmail: addr.ShipEmail || addr.email || ord.userEmail || "customer@apexworkwear.com",
    ShipAddr: addr.ShipAddr || addr.ShipAddress1 || addr.address || "335 Steelcase W",
    ShipAddr2: addr.ShipAddr2 || addr.apartment || "",
    ShipCity: addr.ShipCity || addr.city || "Markham",
    ShipState: shipState,
    ShipZip: addr.ShipZip || addr.zip || "L3R 1G3",
    ShipCountry: shipCountry,
    ShipPhone: addr.ShipPhone || addr.phone || "4165550199",
    ShipMethod: ord.shippingMethod || addr.ShipMethod || "UPS Standard"
  };

  // 3. Format Billing Info
  const billAddr = ord.billingAddress || {};
  const billFullName = billAddr.BillName || billAddr.fullName || billAddr.name || fullName;
  const billParts = billFullName.trim().split(" ");
  const billFName = billAddr.BillFName || billParts[0] || shipFName;
  const billLName = billAddr.BillLName || billParts.slice(1).join(" ") || shipLName;

  const billCountry = normalizeCountryCode(billAddr.BillCountry || billAddr.country || shippingInfo.ShipCountry);
  const billState = normalizeStateCode(billAddr.BillState || billAddr.state || shippingInfo.ShipState, billCountry);

  const billingInfo = {
    BillFName: billFName,
    BillLName: billLName,
    BillEmail: billAddr.BillEmail || billAddr.email || shippingInfo.ShipEmail,
    BillAddr: billAddr.BillAddr || billAddr.BillAddress1 || billAddr.address || shippingInfo.ShipAddr,
    BillAddr2: billAddr.BillAddr2 || billAddr.apartment || shippingInfo.ShipAddr2,
    BillCity: billAddr.BillCity || billAddr.city || shippingInfo.ShipCity,
    BillState: billState,
    BillZip: billAddr.BillZip || billAddr.zip || shippingInfo.ShipZip,
    BillCountry: billCountry,
    BillPhone: billAddr.BillPhone || billAddr.phone || shippingInfo.ShipPhone
  };

  const notes = ord.notes || `Order ${ord.id} placed via Apex Storefront`;

  return { items, shippingInfo, billingInfo, notes };
}

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
    const { items, shippingInfo, billingInfo, notes } = formatSinaliteOrderPayload(ord);

    if (items.length === 0) {
      return Response.json({ error: "No print products eligible for SinaLite submission found in this order." }, { status: 400 });
    }

    console.log(`Submitting order ${orderId} to SinaLite with payload:`, JSON.stringify({ items, shippingInfo, billingInfo, notes }));

    // Call placeOrder(items, shippingInfo, billingInfo, notes)
    const sinaliteRes = await placeOrder(items, shippingInfo, billingInfo, notes);

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
      message: `Successfully transmitted order #${orderId} to SinaLite! Ref ID: #${sinaliteOrderId}`
    });

  } catch (err) {
    console.error("Manual SinaLite order placement error:", err);
    return Response.json({ error: err.message || "Failed to submit order to SinaLite." }, { status: 500 });
  }
}
