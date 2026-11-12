import { adminDb } from "@/lib/firebase-admin";
import { getShippingEstimate } from "@/lib/sinalite";
import { normalizeCountryCode, normalizeStateCode, formatPostalCode } from "@/lib/location-data";

/**
 * POST /api/admin/orders/shipping-methods
 * Fetches available live shipping methods directly from SinaLite for a specific order's items and address.
 */
export async function POST(req) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing required order ID" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const ord = orderDoc.data();

    // Verify order is not already submitted to SinaLite
    if (ord.sinaliteOrderId) {
      return Response.json({
        error: `Order is already transmitted to SinaLite (Ref #${ord.sinaliteOrderId}). Shipping cannot be changed.`
      }, { status: 400 });
    }

    // Filter print items for SinaLite
    const printItems = (ord.items || [])
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
        return {
          productId: parseInt(item.productId),
          options: optionsObj
        };
      });

    if (printItems.length === 0) {
      return Response.json({
        error: "This order does not contain SinaLite print products. Shipping methods are only available for SinaLite orders."
      }, { status: 400 });
    }

    const addr = ord.shippingAddress || {};
    const rawZip = addr.ShipZip || addr.zip || "";
    const shipCountry = normalizeCountryCode(addr.ShipCountry || addr.country || "CA");
    const shipState = normalizeStateCode(addr.ShipState || addr.state || "ON", shipCountry);
    const shipZip = formatPostalCode(rawZip, shipCountry);

    if (!shipZip) {
      return Response.json({ error: "Invalid postal/ZIP code in order shipping address." }, { status: 400 });
    }

    const shippingInfo = {
      ShipState: shipState,
      ShipCountry: shipCountry,
      ShipZip: shipZip
    };

    console.log(`[Admin] Fetching SinaLite shipping estimate for order ${orderId} to ${shipZip}, ${shipState}, ${shipCountry}`);

    const estimate = await getShippingEstimate(printItems, shippingInfo);
    const methods = [];

    if (estimate && Array.isArray(estimate.body)) {
      estimate.body.forEach((rateArr) => {
        if (Array.isArray(rateArr) && rateArr.length >= 3) {
          const [carrier, serviceName, price, deliveryDays] = rateArr;

          let cleanName = serviceName;
          if (carrier && serviceName && !serviceName.toLowerCase().startsWith(carrier.toLowerCase())) {
            cleanName = `${carrier} ${serviceName}`;
          }

          methods.push({
            serviceName: cleanName || serviceName || carrier || "Express Shipping",
            price: parseFloat(price || 0),
            deliveryDays: deliveryDays ? deliveryDays.toString() : "3-5"
          });
        }
      });
    }

    const currentMethod = ord.shippingMethod || ord.shippingAddress?.ShipMethod || "Standard Courier Shipping";
    const originalShippingPrice = parseFloat(ord.totals?.shipping || 0);

    return Response.json({
      success: true,
      orderId,
      currentMethod,
      originalShippingPrice,
      methods
    });
  } catch (error) {
    console.error("[Admin Shipping Methods Error]:", error);
    return Response.json({ error: error.message || "Failed to fetch shipping methods from SinaLite." }, { status: 500 });
  }
}

