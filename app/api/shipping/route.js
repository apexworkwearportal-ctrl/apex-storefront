import { getShippingEstimate } from "@/lib/sinalite";

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

    if (sinaliteItemsFiltered.length > 0) {
      // Map shippingAddress to the shippingInfo format required by SinaLite
      const shippingInfo = {
        ShipState: shippingAddress.ShipState || shippingAddress.state || "",
        ShipCountry: shippingAddress.ShipCountry || shippingAddress.country || "CA",
        ShipZip: shipZip
      };

      // Query SinaLite shipping estimation once with the complete payload
      const estimate = await getShippingEstimate(sinaliteItemsFiltered, shippingInfo);

      // Parse SinaLite response structure where shipping options are returned in the "body" array
      if (estimate && Array.isArray(estimate.body)) {
        estimate.body.forEach((rateArr) => {
          if (Array.isArray(rateArr) && rateArr.length >= 3) {
            const [carrier, serviceName, price, deliveryDays] = rateArr;
            
            // Deduplicate service name if it already starts with the carrier name
            let cleanName = serviceName;
            if (carrier && serviceName && !serviceName.toLowerCase().startsWith(carrier.toLowerCase())) {
              cleanName = `${carrier} ${serviceName}`;
            }

            // Add handling upcharge if custom apparel items exist in the same order
            let finalPrice = parseFloat(price || 0);
            if (customItems.length > 0) {
              finalPrice += 5.00 * customItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
            }

            ratesList.push({
              serviceName: cleanName || "Courier Shipping",
              price: finalPrice,
              deliveryDays: deliveryDays ? deliveryDays.toString() : "3-5"
            });
          }
        });
      }
    } else {
      // Custom items only (e.g. apparel)
      const totalCustomQty = customItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
      ratesList = [
        { serviceName: "Standard Shipping (Apparel)", price: 9.99 + (1.50 * (totalCustomQty - 1)), deliveryDays: "5-7" },
        { serviceName: "Express Shipping (Apparel)", price: 19.99 + (3.00 * (totalCustomQty - 1)), deliveryDays: "2-3" }
      ];
    }

    if (ratesList.length === 0) {
      // Fallback standard shipping rates if API returns empty
      return Response.json([
        { serviceName: "Standard Courier", price: 14.99 * items.length, deliveryDays: "3-5" },
        { serviceName: "Express Courier", price: 29.99 * items.length, deliveryDays: "1-2" },
      ]);
    }

    return Response.json(ratesList);
  } catch (error) {
    console.error("Shipping lookup failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
