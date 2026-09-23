import { getShippingEstimate } from "@/lib/sinalite";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeCountryCode, normalizeStateCode, formatPostalCode } from "@/lib/location-data";

export async function POST(req) {
  try {
    const { items, shippingAddress } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return Response.json({ error: "Missing required shipping address or cart items" }, { status: 400 });
    }

    const rawZip = shippingAddress.ShipZip || shippingAddress.zip || "";
    const shipCountry = normalizeCountryCode(shippingAddress.ShipCountry || shippingAddress.country || "CA");
    const shipState = normalizeStateCode(shippingAddress.ShipState || shippingAddress.state || "ON", shipCountry);
    const shipZip = formatPostalCode(rawZip, shipCountry);

    if (!shipZip || shipZip.trim().length < 3) {
      return Response.json({ error: "Please enter a valid postal or ZIP code to calculate shipping rates." }, { status: 400 });
    }

    console.log(`Calculating shipping estimate to ZIP: ${shipZip}, State: ${shipState}, Country: ${shipCountry}`);

    const customItems = items.filter(item => item.isCustom || isNaN(parseInt(item.productId)));
    const printItemsFiltered = items
      .filter(item => !item.isCustom && !isNaN(parseInt(item.productId)))
      .map(item => ({
        productId: parseInt(item.productId),
        options: item.selectedOptionMap || item.options || {}
      }));

    let ratesList = [];

    // Case A: Cart contains Print products (or Mixed Print + Apparel) -> Fetch Live Print Shipping from API
    if (printItemsFiltered.length > 0) {
      const shippingInfo = {
        ShipState: shipState,
        ShipCountry: shipCountry,
        ShipZip: shipZip
      };


      const estimate = await getShippingEstimate(printItemsFiltered, shippingInfo);

      if (estimate && Array.isArray(estimate.body)) {
        estimate.body.forEach((rateArr) => {
          if (Array.isArray(rateArr) && rateArr.length >= 3) {
            const [carrier, serviceName, price, deliveryDays] = rateArr;
            
            let cleanName = serviceName;
            if (carrier && serviceName && !serviceName.toLowerCase().startsWith(carrier.toLowerCase())) {
              cleanName = `${carrier} ${serviceName}`;
            }

            ratesList.push({
              serviceName: cleanName || serviceName || carrier || "Express Shipping",
              price: parseFloat(price || 0),
              deliveryDays: deliveryDays ? deliveryDays.toString() : "3-5"
            });
          }
        });
      }

      if (ratesList.length === 0) {
        return Response.json({ 
          error: "No shipping rates returned by 3rd party API for this address. Please verify postal code format." 
        }, { status: 400 });
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
        return Response.json({ error: "Apparel shipping rates are not configured in Admin Settings." }, { status: 400 });
      }
    }

    return Response.json(ratesList);
  } catch (error) {
    console.error("Shipping lookup error:", error.message);
    return Response.json({ error: error.message || "Failed to fetch shipping rates from API." }, { status: 500 });
  }
}
