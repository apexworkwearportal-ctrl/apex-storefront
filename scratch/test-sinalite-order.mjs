import { placeOrder } from "../lib/sinalite.js";

async function testOrder() {
  console.log("Testing placeOrder API call...");

  const items = [
    {
      productId: 1,
      options: [1, 2, 3],
      files: []
    }
  ];

  const shippingInfo = {
    ShipName: "John Doe",
    ShipCompany: "Apex Workwear",
    ShipAddress1: "123 Main Street",
    ShipAddress2: "",
    ShipCity: "Toronto",
    ShipState: "ON",
    ShipZip: "M5V2T6",
    ShipCountry: "CA",
    ShipPhone: "4165550199"
  };

  const billingInfo = { ...shippingInfo };
  const notes = "Test Order";

  try {
    const res = await placeOrder(items, shippingInfo, billingInfo, notes);
    console.log("SUCCESS! Response:", res);
  } catch (err) {
    console.error("FAILED! Error:", err.message);
  }
}

testOrder();
