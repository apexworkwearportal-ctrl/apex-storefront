const SINALITE_API_URL = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";

async function debugOrder() {
  console.log("Sending POST to:", `${SINALITE_API_URL}/order/new`);

  const payload = {
    items: [
      {
        productId: 1,
        options: [1, 2, 3]
      }
    ],
    shippingInfo: {
      ShipName: "John Doe",
      ShipCompany: "Apex Workwear",
      ShipAddress1: "123 Main Street",
      ShipAddress2: "",
      ShipCity: "Toronto",
      ShipState: "ON",
      ShipZip: "M5V2T6",
      ShipCountry: "CA",
      ShipPhone: "4165550199"
    },
    billingInfo: {
      ShipName: "John Doe",
      ShipCompany: "Apex Workwear",
      ShipAddress1: "123 Main Street",
      ShipAddress2: "",
      ShipCity: "Toronto",
      ShipState: "ON",
      ShipZip: "M5V2T6",
      ShipCountry: "CA",
      ShipPhone: "4165550199"
    },
    notes: "Test Order"
  };

  const res = await fetch(`${SINALITE_API_URL}/order/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log("HTTP Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response Body:", text);
}

debugOrder();
