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

    // Categorize cart items into SinaLite, In-House Custom Print, and Apparel
    const isApparelItem = (i) => Boolean(
      i.isApparel ||
      i.category === "apparel" ||
      i.categoryId === "apparel" ||
      i.apparelViews ||
      i.garmentViews ||
      i.selectedSizes ||
      i.embroiderySetupFee > 0 ||
      i.isEmbroidery
    );

    const isCustomPrintItem = (i) => !isApparelItem(i) && Boolean(
      i.isCustom ||
      isNaN(parseInt(i.productId)) ||
      i.customPrintSizes ||
      i.sidesPages
    );

    const isSinaliteItem = (i) => !isApparelItem(i) && !isCustomPrintItem(i) && !isNaN(parseInt(i.productId));

    const sinaliteItems = items.filter(isSinaliteItem);
    const customPrintItems = items.filter(isCustomPrintItem);
    const apparelItems = items.filter(isApparelItem);

    let ratesList = [];

    // Case A: Cart contains at least ONE SinaLite product -> Fetch Live Rates from SinaLite API
    // (If mixed with custom/apparel, follow SinaLite shipping as requested; order will be split upon checkout)
    if (sinaliteItems.length > 0) {
      const printItemsFiltered = sinaliteItems.map(item => ({
        productId: parseInt(item.productId),
        options: item.selectedOptionMap || item.options || {}
      }));

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
      // Case B: Cart contains NO SinaLite products -> In-House Shipping Classes ONLY
      const totalCustomQty = customPrintItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
      const totalApparelQty = apparelItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
      const totalInHouseQty = totalCustomQty + totalApparelQty;

      // Determine which classes to load
      let inHouseClasses = [];
      const hasCustomPrint = customPrintItems.length > 0;
      const hasApparel = apparelItems.length > 0;

      if (adminDb) {
        try {
          if (hasCustomPrint && !hasApparel) {
            // Pure Custom Print
            const snap = await adminDb.collection("settings").doc("customShipping").get();
            if (snap.exists && Array.isArray(snap.data().classes) && snap.data().classes.length > 0) {
              inHouseClasses = snap.data().classes.filter(c => c.active !== false);
            }
          } else if (hasApparel && !hasCustomPrint) {
            // Pure Apparel
            const snap = await adminDb.collection("settings").doc("apparelShipping").get();
            if (snap.exists && Array.isArray(snap.data().classes) && snap.data().classes.length > 0) {
              inHouseClasses = snap.data().classes.filter(c => c.active !== false);
            }
          } else {
            // Mixed In-House Custom Print + Apparel
            const [customSnap, apparelSnap] = await Promise.all([
              adminDb.collection("settings").doc("customShipping").get().catch(() => null),
              adminDb.collection("settings").doc("apparelShipping").get().catch(() => null)
            ]);

            const cClasses = customSnap?.exists && Array.isArray(customSnap.data().classes) ? customSnap.data().classes.filter(c => c.active !== false) : [];
            const aClasses = apparelSnap?.exists && Array.isArray(apparelSnap.data().classes) ? apparelSnap.data().classes.filter(c => c.active !== false) : [];

            inHouseClasses = cClasses.length > 0 ? cClasses : aClasses;
          }
        } catch (dbErr) {
          console.warn("Error loading in-house shipping classes:", dbErr.message);
        }
      }

      // Default fallbacks if none configured in Firestore
      if (inHouseClasses.length === 0) {
        if (hasCustomPrint) {
          inHouseClasses = [
            { id: "std-custom-print", name: "Standard In-House Print Shipping", basePrice: 14.99, perItemPrice: 2.00, deliveryDays: "4-6 days", active: true },
            { id: "exp-custom-print", name: "Express In-House Print Shipping", basePrice: 24.99, perItemPrice: 3.50, deliveryDays: "2-3 days", active: true }
          ];
        } else {
          inHouseClasses = [
            { id: "std-apparel", name: "Standard Apparel Shipping", basePrice: 9.99, perItemPrice: 1.50, deliveryDays: "5-7 days", active: true },
            { id: "exp-apparel", name: "Express Apparel Shipping", basePrice: 19.99, perItemPrice: 3.00, deliveryDays: "2-3 days", active: true }
          ];
        }
      }

      ratesList = inHouseClasses.map(cls => {
        const base = parseFloat(cls.basePrice || 0);
        const addl = parseFloat(cls.perItemPrice || 0);
        const calcPrice = base + (addl * Math.max(0, totalInHouseQty - 1));
        return {
          serviceName: cls.name || "In-House Shipping",
          price: parseFloat(calcPrice.toFixed(2)),
          deliveryDays: cls.deliveryDays || "3-5"
        };
      });
    }

    return Response.json(ratesList);
  } catch (error) {
    console.error("Shipping lookup error:", error.message);
    return Response.json({ error: error.message || "Failed to fetch shipping rates from API." }, { status: 500 });
  }
}
