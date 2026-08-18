import resend from "./resend";

export async function sendOrderConfirmationEmail(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@apexworkwear.ca";

  const customerEmail = order.shippingAddress.ShipEmail;
  const customerName = `${order.shippingAddress.ShipFName} ${order.shippingAddress.ShipLName}`;
  const total = parseFloat(order.totals.grandTotal).toFixed(2);
  const itemsSummary = order.items.map(i => `• ${i.name} (x${i.quantity}) - $${parseFloat(i.price * i.quantity).toFixed(2)}`).join("\n");

  const emailText = `Dear ${customerName},

Thank you for your order! We have received your printing request and submitted it for processing.

Order ID: ${order.id}
Placed On: ${new Date(order.createdAt?.seconds * 1000 || order.createdAt).toLocaleString()}
Grand Total: $${total} CAD

Items Ordered:
${itemsSummary}

Fulfillment Shipping Method: ${order.shippingAddress.ShipMethod}
Delivery Address:
${order.shippingAddress.ShipAddr}
${order.shippingAddress.ShipAddr2 ? order.shippingAddress.ShipAddr2 + "\n" : ""}${order.shippingAddress.ShipCity}, ${order.shippingAddress.ShipState} ${order.shippingAddress.ShipZip}

We will send another notification with tracking details as soon as your package ships. If you have any questions, feel free to call us at (647) 570-1249.

Best regards,
The Apex Workwear Team
`;

  console.log(`[Email Mock] Sending order confirmation email to: ${customerEmail}`);
  console.log(emailText);

  if (!apiKey || apiKey === "mock_resend_key" || apiKey === "") {
    console.warn("Resend API key is not configured. Receipt email was logged to server console.");
    return { success: true, mock: true };
  }

  try {
    // 1. Send receipt to customer
    await resend.emails.send({
      from: `Apex Workwear <${fromEmail}>`,
      to: customerEmail,
      subject: `Order Confirmation #${order.id.slice(0, 8)} - Apex Workwear`,
      text: emailText,
    });

    // 2. Send notification to admin
    await resend.emails.send({
      from: `Apex System <${fromEmail}>`,
      to: "info@apexworkwear.ca",
      subject: `[New Order] #${order.id.slice(0, 8)} placed by ${customerName}`,
      text: `A new custom printing order has been paid and received.

Order ID: ${order.id}
Customer: ${customerName} (${customerEmail})
Grand Total: $${total} CAD
SinaLite Order ID: ${order.sinaliteOrderId || "Pending manually"}

Items:
${itemsSummary}
`,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send Resend transaction emails:", error);
    return { success: false, error: error.message };
  }
}
