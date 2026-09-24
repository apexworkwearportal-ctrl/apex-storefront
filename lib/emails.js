import resend from "./resend.js";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "apexworkwearportal@gmail.com";
const PREFERRED_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "info@notification.apexworkwear.ca";
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

async function sendEmailWithFallback({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "mock_resend_key" || !resend) {
    console.warn("[Email Mock] Resend API key not configured. Logging email body to console.");
    console.log(`TO: ${to}\nSUBJECT: ${subject}\nTEXT:\n${text}`);
    return { success: true, mock: true };
  }

  // Attempt 1: Preferred from address
  try {
    const res = await resend.emails.send({
      from: `Apex Workwear <${PREFERRED_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    if (res.error) {
      // Check if domain validation error (403 unverified domain)
      if (res.error.statusCode === 403 || res.error.message?.includes("domain")) {
        console.warn(`[Email Warning] Domain ${PREFERRED_FROM_EMAIL} unverified. Retrying with ${FALLBACK_FROM_EMAIL}...`);
        const fallbackRes = await resend.emails.send({
          from: `Apex Workwear <${FALLBACK_FROM_EMAIL}>`,
          to,
          subject,
          html,
          text,
        });
        return { success: !fallbackRes.error, data: fallbackRes.data, error: fallbackRes.error };
      }
      return { success: false, error: res.error };
    }

    return { success: true, data: res.data };
  } catch (err) {
    console.error("Resend Sending Error:", err);
    // Attempt fallback on exception
    try {
      const fallbackRes = await resend.emails.send({
        from: `Apex Workwear <${FALLBACK_FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
      return { success: !fallbackRes.error, data: fallbackRes.data, error: fallbackRes.error };
    } catch (fErr) {
      return { success: false, error: fErr.message };
    }
  }
}

export async function sendOrderConfirmationEmail(order) {
  const addr = order.shippingAddress || {};
  const customerEmail = addr.ShipEmail || addr.email || order.userEmail || "customer@example.com";
  const customerName = `${addr.ShipFName || "Valued"} ${addr.ShipLName || "Customer"}`.trim();
  const total = parseFloat(order.totals?.grandTotal || 0).toFixed(2);
  const orderId = order.id || "N/A";
  const shortId = orderId.substring(0, 8);
  const items = order.items || [];

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">
        ${item.name}
        ${item.optionSummary ? `<div style="font-size: 12px; color: #6b7280; font-weight: normal; margin-top: 4px;">${item.optionSummary}</div>` : ""}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)} CAD</td>
    </tr>
  `).join("");

  const itemsText = items.map(i => `• ${i.name} (x${i.quantity}) - $${(parseFloat(i.price || 0) * parseInt(i.quantity || 1)).toFixed(2)} CAD`).join("\n");

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">APEX WORKWEAR & PRINT</h1>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">Order Confirmation #${shortId}</p>
      </div>

      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Thank you for your order! We have successfully received your print/apparel request and it has been submitted for processing.</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Order Details</div>
          <div><strong>Order Ref:</strong> ${orderId}</div>
          <div><strong>Fulfillment Method:</strong> ${addr.ShipMethod || "Standard Courier Shipping"}</div>
          <div><strong>Shipping Address:</strong> ${addr.ShipAddr || ""}${addr.ShipAddr2 ? ", " + addr.ShipAddr2 : ""}, ${addr.ShipCity || ""}, ${addr.ShipState || ""} ${addr.ShipZip || ""}, ${addr.ShipCountry || "CA"}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569;">
              <th style="padding: 10px 12px;">Item</th>
              <th style="padding: 10px 12px; text-align: center;">Qty</th>
              <th style="padding: 10px 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 16px; font-size: 16px; font-weight: 800; color: #0f172a;">
          Grand Total: <span style="color: #2563eb;">$${total} CAD</span>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="font-size: 13px; color: #64748b;">
          We will notify you with tracking details as soon as your package ships. If you have any questions or need to adjust your order, please contact us at <a href="tel:6475701249" style="color: #2563eb;">(647) 570-1249</a> or email <a href="mailto:info@apexworkwear.ca" style="color: #2563eb;">info@apexworkwear.ca</a>.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        © ${new Date().getFullYear()} Apex Workwear & Print. All rights reserved.
      </div>
    </div>
  `;

  const customerText = `Dear ${customerName},

Thank you for your order! We have received your order #${shortId}.

Order ID: ${orderId}
Grand Total: $${total} CAD

Items Ordered:
${itemsText}

Shipping Address:
${addr.ShipAddr || ""}${addr.ShipAddr2 ? ", " + addr.ShipAddr2 : ""}, ${addr.ShipCity || ""}, ${addr.ShipState || ""} ${addr.ShipZip || ""}

Thank you for choosing Apex Workwear & Print!
`;

  // 1. Send Customer Confirmation Email
  const customerResult = await sendEmailWithFallback({
    to: customerEmail,
    subject: `Order Confirmation #${shortId} - Apex Workwear`,
    html: customerHtml,
    text: customerText,
  });

  // 2. Send Admin Notification Email
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">[NEW ORDER ALERT] #${shortId}</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Customer: ${customerName} (${customerEmail})</p>
      </div>

      <div style="padding: 20px; color: #334155; font-size: 14px;">
        <p>A new order has been paid and received on Apex Storefront.</p>
        
        <div><strong>Order ID:</strong> ${orderId}</div>
        <div><strong>SinaLite Ref ID:</strong> ${order.sinaliteOrderId || "Pending / Manual Submission Required"}</div>
        <div><strong>Fulfillment Type:</strong> ${order.fulfillmentType || "Standard Print / Custom"}</div>
        <div><strong>Grand Total:</strong> $${total} CAD</div>
        <div><strong>Customer Phone:</strong> ${addr.ShipPhone || "N/A"}</div>

        <h3 style="margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Items Ordered</h3>
        <ul>
          ${items.map(i => `<li><strong>${i.name}</strong> (x${i.quantity}) - $${(parseFloat(i.price || 0) * parseInt(i.quantity || 1)).toFixed(2)} CAD ${i.artworkUrl ? `<br/><a href="${i.artworkUrl}">View Artwork File</a>` : ""}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  const adminText = `[NEW ORDER ALERT] Order #${shortId}
Customer: ${customerName} (${customerEmail})
Grand Total: $${total} CAD
SinaLite Ref: ${order.sinaliteOrderId || "Pending"}

Items:
${itemsText}
`;

  const adminResult = await sendEmailWithFallback({
    to: DEFAULT_ADMIN_EMAIL,
    subject: `[New Order Alert] #${shortId} - ${customerName} ($${total} CAD)`,
    html: adminHtml,
    text: adminText,
  });

  return { success: true, customer: customerResult, admin: adminResult };
}

export async function sendOrderStatusUpdateEmail(order, statusText, trackingNumber = "") {
  const addr = order.shippingAddress || {};
  const customerEmail = addr.ShipEmail || addr.email || order.userEmail;
  if (!customerEmail) return { success: false, error: "No customer email found" };

  const customerName = `${addr.ShipFName || "Valued"} ${addr.ShipLName || "Customer"}`.trim();
  const shortId = (order.id || "").substring(0, 8);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Order Status Update #${shortId}</h2>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your order status has been updated to: <strong style="color: #2563eb; text-transform: uppercase;">${statusText}</strong>.</p>
        ${trackingNumber ? `<div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; margin: 16px 0;"><strong>Tracking Number / Ref:</strong> ${trackingNumber}</div>` : ""}
        <p>Thank you for choosing Apex Workwear & Print!</p>
      </div>
    </div>
  `;

  return sendEmailWithFallback({
    to: customerEmail,
    subject: `Order Update #${shortId}: ${statusText} - Apex Workwear`,
    html,
    text: `Dear ${customerName},\n\nYour order #${shortId} status is now: ${statusText}.${trackingNumber ? "\nTracking Number: " + trackingNumber : ""}\n\nThank you!`,
  });
}
