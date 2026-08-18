import { getShippingEstimate } from "@/lib/sinalite";

export async function POST(req) {
  try {
    const { items, shippingAddress } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shipZip = shippingAddress.ShipZip || shippingAddress.zip || "";
    console.log(`Calculating shipping estimate to ZIP: ${shipZip}`);

    // Map frontend item shape to the structure required by the SinaLite shipping API
    const sinaliteItems = items.map(item => ({
      productId: parseInt(item.productId),
      options: item.selectedOptionMap
    }));

    // Map shippingAddress to the shippingInfo format required by SinaLite
    const shippingInfo = {
      ShipState: shippingAddress.ShipState || shippingAddress.state || "",
      ShipCountry: shippingAddress.ShipCountry || shippingAddress.country || "CA",
      ShipZip: shipZip
    };

    // Query SinaLite shipping estimation once with the complete payload
    const estimate = await getShippingEstimate(sinaliteItems, shippingInfo);

    const ratesList = [];

    // Parse SinaLite response structure where shipping options are returned in the "body" array
    // Format of each row: [carrier, serviceName, price, deliveryDays]
    if (estimate && Array.isArray(estimate.body)) {
      estimate.body.forEach((rateArr) => {
        if (Array.isArray(rateArr) && rateArr.length >= 3) {
          const [carrier, serviceName, price, deliveryDays] = rateArr;
          
          // Deduplicate service name if it already starts with the carrier name
          let cleanName = serviceName;
          if (carrier && serviceName && !serviceName.toLowerCase().startsWith(carrier.toLowerCase())) {
            cleanName = `${carrier} ${serviceName}`;
          }

          ratesList.push({
            serviceName: cleanName || "Courier Shipping",
            price: parseFloat(price || 0),
            deliveryDays: deliveryDays ? deliveryDays.toString() : "3-5"
          });
        }
      });
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
