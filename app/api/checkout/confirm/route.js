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

      // Check auto-submission toggle setting in Firestore
      let autoSubmitSinalite = false;
      try {
        const fulSnap = await adminDb.collection("settings").doc("fulfillment").get();
        if (fulSnap.exists) {
          autoSubmitSinalite = !!fulSnap.data().autoSubmitSinalite;
        }
      } catch (fErr) {
        console.warn("Could not load fulfillment settings:", fErr.message);
      }

      const confirmedList = [];

      for (const ord of splitOrders) {
        let sinaliteOrderId = null;

        // If Print order and auto-submit is ENABLED, submit to SinaLite
        if (ord.fulfillmentType === "sinalite" && autoSubmitSinalite) {
          try {
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

            if (sinaliteItems.length > 0) {
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
              const notes = ord.notes || `Order ${ord.id} placed via Apex Storefront`;

              // Correct parameter sequence: items, shippingInfo, billingInfo, notes
              const sinaliteRes = await placeOrder(sinaliteItems, shippingInfo, billingInfo, notes);
              if (sinaliteRes && (sinaliteRes.orderId || sinaliteRes.order_id || sinaliteRes.id)) {
                sinaliteOrderId = String(sinaliteRes.orderId || sinaliteRes.order_id || sinaliteRes.id);
              }
            }
          } catch (err) {
            console.error("SinaLite automatic order placement failed:", err.message);
          }
        }

        const finalizedDoc = {
          ...ord,
          status: ord.fulfillmentType === "sinalite"
            ? (sinaliteOrderId ? "submitted" : (autoSubmitSinalite ? "pending_submission" : "pending_submission"))
            : "pending_apparel_fulfillment",
          sinaliteOrderId,
          autoSubmitEnabled: autoSubmitSinalite
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
