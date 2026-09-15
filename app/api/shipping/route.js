import { getShippingEstimate } from "@/lib/sinalite";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { items, shippingAddress } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shipZip = shippingAddress.ShipZip || shippingAddress.zip || "";
    console.log(`Calculating shipping estimate to ZIP: ${shipZip}`);

    const customItems = items.filter(item => item.isCustom || isNaN(parseInt(item.productId)));
    const sinaliteItemsFiltered = items
      .filter(item => !item.isCustom && !isNaN(parseInt(item.productId)))
      .map(item => ({
        productId: parseInt(item.productId),
        options: item.selectedOptionMap
      }));

    let ratesList = [];

    // Case A: Cart contains Print products (or Mixed Print + Apparel) -> Use ONLY SinaLite Print Shipping
    if (sinaliteItemsFiltered.length > 0) {
      const shippingInfo = {
        ShipState: shippingAddress.ShipState || shippingAddress.state || "",
        ShipCountry: shippingAddress.ShipCountry || shippingAddress.country || "CA",
        ShipZip: shipZip
      };

      const estimate = await getShippingEstimate(sinaliteItemsFiltered, shippingInfo);

      if (estimate && Array.isArray(estimate.body)) {
        estimate.body.forEach((rateArr) => {
          if (Array.isArray(rateArr) && rateArr.length >= 3) {
            const [carrier, serviceName, price, deliveryDays] = rateArr;
            
            let cleanName = serviceName;
            if (carrier && serviceName && !serviceName.toLowerCase().startsWith(carrier.toLowerCase())) {
              cleanName = `${carrier} ${serviceName}`;
            }

            // Return SinaLite shipping rate ONLY (No extra apparel charge added)
            ratesList.push({
              serviceName: cleanName || "Courier Shipping",
              price: parseFloat(price || 0),
              deliveryDays: deliveryDays ? deliveryDays.toString() : "3-5"
            });
          }
        });
      }
    } else {
      // Case B: Cart contains ONLY Custom Apparel products -> Load Admin Apparel Shipping Classes
      const totalCustomQty = customItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);

      let customClasses = [];
      if (adminDb) {
        try {
          const snap = await adminDb.collection("settings").doc("apparelShipping").get();
          if (snap.exists && Array.isArray(snap.data().classes)) {
            customClasses = snap.data().classes;
          }
        } catch (dbErr) {
          console.warn("Error loading admin apparel shipping classes:", dbErr.message);
        }
      }

      if (customClasses.length > 0) {
        ratesList = customClasses.map(cls => {
          const base = parseFloat(cls.basePrice || 0);
          const addl = parseFloat(cls.perItemPrice || 0);
          const calcPrice = base + (addl * Math.max(0, totalCustomQty - 1));
          return {
            serviceName: cls.name || "Apparel Shipping",
            price: parseFloat(calcPrice.toFixed(2)),
            deliveryDays: cls.deliveryDays || "3-5"
          };
        });
      } else {
        // Fallback default apparel shipping classes
        ratesList = [
          { serviceName: "Standard Apparel Shipping", price: parseFloat((9.99 + (1.50 * (totalCustomQty - 1))).toFixed(2)), deliveryDays: "5-7" },
          { serviceName: "Express Apparel Shipping", price: parseFloat((19.99 + (3.00 * (totalCustomQty - 1))).toFixed(2)), deliveryDays: "2-3" },
          { serviceName: "Apparel Local Pickup (Storefront)", price: 0.00, deliveryDays: "1-2" }
        ];
      }
    }

    if (ratesList.length === 0) {
      return Response.json([
        { serviceName: "Standard Shipping", price: 14.99 * items.length, deliveryDays: "3-5" },
        { serviceName: "Express Shipping", price: 29.99 * items.length, deliveryDays: "1-2" }
      ]);
    }

    return Response.json(ratesList);
  } catch (error) {
    console.error("Shipping lookup failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
