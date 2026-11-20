import resend from "./resend.js";
import { adminDb, adminAuth } from "./firebase-admin.js";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "apexworkwearportal@gmail.com";
const PREFERRED_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "info@notification.apexworkwear.ca";
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

/**
 * Fetch all administrator email addresses dynamically from Firestore and Firebase Auth,
 * falling back to configured environment notification emails.
 */
export async function getAllAdminEmails() {
  const adminEmailsSet = new Set();

  // 1. Add configured environment fallback emails (supporting comma-separated lists)
  if (DEFAULT_ADMIN_EMAIL) {
    DEFAULT_ADMIN_EMAIL.split(",").map(e => e.trim()).filter(Boolean).forEach(e => adminEmailsSet.add(e.toLowerCase()));
  }

  // 2. Fetch from Firestore users collection where role === "admin"
  if (adminDb) {
    try {
      const snap = await adminDb.collection("users").where("role", "==", "admin").get();
      snap.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          adminEmailsSet.add(data.email.trim().toLowerCase());
        }
      });
    } catch (err) {
      console.warn("[Email Notification] Could not query Firestore for admin users:", err.message);
    }
  }

  // 3. Check Firebase Auth for users with admin custom claims
  if (adminAuth) {
    try {
      const listRes = await adminAuth.listUsers(500);
      listRes.users.forEach(u => {
        const claims = u.customClaims || {};
        if (claims.admin === true || claims.role === "admin") {
          if (u.email) {
            adminEmailsSet.add(u.email.trim().toLowerCase());
          }
        }
      });
    } catch (err) {
      console.warn("[Email Notification] Could not query Firebase Auth for admin users:", err.message);
    }
  }

  // Always ensure at least the primary portal email is included if set was empty
  if (adminEmailsSet.size === 0) {
    adminEmailsSet.add("apexworkwearportal@gmail.com");
  }

  return Array.from(adminEmailsSet);
}

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
  const isPickup = order.isPickup || order.fulfillmentMethod === "pickup" || String(addr.ShipMethod || "").toLowerCase().includes("pickup");
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

  const fulfillmentSectionHtml = isPickup ? `
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <div style="font-weight: 800; font-size: 14px; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        🏬 Store Pickup Order (Free)
      </div>
      <div style="font-size: 14px; color: #15803d; line-height: 1.5;">
        <div><strong>Pickup Location:</strong></div>
        <div>Apex Workwear & Print</div>
        <div>1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1</div>
        <div><strong>Phone:</strong> (647) 570-1249</div>
        <div style="margin-top: 8px; font-size: 13px; color: #166534;">
          ⏰ <strong>Pickup Hours:</strong> Mon – Fri: 9:00 AM – 6:00 PM | Sat: 10:00 AM – 4:00 PM
        </div>
        <div style="margin-top: 8px; font-style: italic; font-size: 13px; color: #14532d;">
          You will receive an email confirmation as soon as your order is ready for pickup!
        </div>
      </div>
    </div>
  ` : `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <div style="font-weight: 700; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Delivery Details</div>
      <div><strong>Order Ref:</strong> ${orderId}</div>
      <div><strong>Fulfillment Method:</strong> ${addr.ShipMethod || "Standard Courier Shipping"}</div>
      <div><strong>Shipping Address:</strong> ${addr.ShipAddr || ""}${addr.ShipAddr2 ? ", " + addr.ShipAddr2 : ""}, ${addr.ShipCity || ""}, ${addr.ShipState || ""} ${addr.ShipZip || ""}, ${addr.ShipCountry || "CA"}</div>
    </div>
  `;

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">APEX WORKWEAR & PRINT</h1>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">Order Confirmation #${shortId}</p>
      </div>

      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Thank you for your order! We have successfully received your print/apparel request and it has been submitted for processing.</p>

        ${fulfillmentSectionHtml}

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

        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 14px; display: flex; flex-direction: column; gap: 4px; text-align: right;">
          ${order.totals?.subtotal ? `<div><span style="color: #64748b;">Subtotal:</span> $${parseFloat(order.totals.subtotal).toFixed(2)} CAD</div>` : ""}
          ${(order.promoCode || parseFloat(order.totals?.discount || 0) > 0) ? `<div style="color: #16a34a; font-weight: 700;"><span>Promo Discount (${order.promoCode?.code || "PROMO"}):</span> -$${parseFloat(order.totals?.discount || order.promoCode?.discountAmount || 0).toFixed(2)} CAD</div>` : ""}
          <div><span style="color: #64748b;">${isPickup ? "Fulfillment (Store Pickup):" : "Shipping:"}</span> ${isPickup ? "FREE" : `$${parseFloat(order.totals?.shipping || 0).toFixed(2)} CAD`}</div>
          ${order.totals?.tax ? `<div><span style="color: #64748b;">Tax:</span> $${parseFloat(order.totals.tax).toFixed(2)} CAD</div>` : ""}
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            Grand Total: <span style="color: #2563eb;">$${total} CAD</span>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="font-size: 13px; color: #64748b;">
          ${isPickup ? "We will notify you by email as soon as your order is printed and ready for pickup." : "We will notify you with tracking details as soon as your package ships."} If you have any questions or need to adjust your order, please contact us at <a href="tel:6475701249" style="color: #2563eb;">(647) 570-1249</a> or email <a href="mailto:support@apexworkwear.ca" style="color: #2563eb;">support@apexworkwear.ca</a>.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        © ${new Date().getFullYear()} Apex Workwear & Print. 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1
      </div>
    </div>
  `;

  const customerText = `Dear ${customerName},

Thank you for your order! We have received your order #${shortId}.

Order ID: ${orderId}
Grand Total: $${total} CAD
Fulfillment: ${isPickup ? "Store Pickup (1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1)" : "Courier Shipping"}

Items Ordered:
${itemsText}

${isPickup ? "Pickup Address:\n1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1\nPhone: (647) 570-1249" : `Shipping Address:\n${addr.ShipAddr || ""}${addr.ShipAddr2 ? ", " + addr.ShipAddr2 : ""}, ${addr.ShipCity || ""}, ${addr.ShipState || ""} ${addr.ShipZip || ""}`}

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
        ${(order.promoCode || parseFloat(order.totals?.discount || 0) > 0) ? `<div style="color: #16a34a; font-weight: 700;"><strong>Promo Discount Applied:</strong> ${order.promoCode?.code || "DISCOUNT"} (-$${parseFloat(order.totals?.discount || order.promoCode?.discountAmount || 0).toFixed(2)} CAD)</div>` : ""}
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

  // 2. Send Admin Notification Email to ALL Admins
  const adminEmailList = await getAllAdminEmails();
  const adminSubject = `[New Order Alert] #${shortId} - ${customerName} ($${total} CAD)`;

  const adminResults = await Promise.all(
    adminEmailList.map(adminEmail =>
      sendEmailWithFallback({
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
      })
    )
  );

  return { 
    success: true, 
    customer: customerResult, 
    admin: adminResults[0] || { success: true },
    adminRecipients: adminEmailList 
  };
}

export async function sendOrderStatusUpdateEmail(order, statusText, trackingNumber = "", trackingUrl = "") {
  const addr = order.shippingAddress || {};
  const customerEmail = addr.ShipEmail || addr.email || order.userEmail;
  if (!customerEmail) return { success: false, error: "No customer email found" };

  const customerName = `${addr.ShipFName || "Valued"} ${addr.ShipLName || "Customer"}`.trim();
  const shortId = (order.id || "").substring(0, 8);
  const normalizedStatus = String(statusText || "").toLowerCase().trim();
  const isReadyForPickup = normalizedStatus === "ready_to_pickup" || normalizedStatus.includes("ready for pickup") || normalizedStatus.includes("ready to pickup");

  const effectiveTrackingNum = trackingNumber || order.trackingNumber || order.shippingTrackingNumber || order.sinaliteTrackingNumber || "";
  const effectiveTrackingUrl = trackingUrl || order.trackingUrl || "";

  let statusCalloutHtml = "";
  if (isReadyForPickup) {
    statusCalloutHtml = `
      <div style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          🎉 Your Order is Ready for Pickup!
        </div>
        <p style="margin: 0 0 12px 0; color: #166534; font-size: 14px; line-height: 1.5;">
          Your custom print/apparel job has finished production and inspection. You can pick it up at our Mississauga facility:
        </p>
        <div style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; font-size: 14px; color: #0f172a; line-height: 1.6;">
          <div><strong>Apex Workwear & Print</strong></div>
          <div>1515 Britannia Rd E, Unit 14-15</div>
          <div>Mississauga, ON L4W 4K1</div>
          <div style="margin-top: 4px;"><strong>Facility Phone:</strong> (647) 570-1249</div>
          <div style="margin-top: 8px; font-size: 13px; color: #475569;">
            <strong>Hours:</strong> Mon – Fri: 9:00 AM – 6:00 PM | Sat: 10:00 AM – 4:00 PM
          </div>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12.5px; color: #166534;">
          Please show your Order ID <strong>#${shortId}</strong> upon arrival.
        </p>
      </div>
    `;
  } else if (effectiveTrackingNum || effectiveTrackingUrl) {
    statusCalloutHtml = `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <div style="font-size: 14px; font-weight: 800; color: #1e40af; margin-bottom: 8px;">
          🚚 Courier Tracking Information
        </div>
        ${order.carrier ? `<div style="font-size: 13px; color: #1e3a8a; margin-bottom: 4px;"><strong>Carrier:</strong> ${order.carrier}</div>` : ""}
        ${effectiveTrackingNum ? `<div style="font-size: 13.5px; color: #1e3a8a;"><strong>Tracking Number:</strong> <code style="background-color: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">${effectiveTrackingNum}</code></div>` : ""}
        ${effectiveTrackingUrl ? `
          <div style="margin-top: 14px;">
            <a href="${effectiveTrackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
              Track Your Package &rarr;
            </a>
          </div>
        ` : ""}
      </div>
    `;
  }

  const emailSubject = isReadyForPickup 
    ? `🎉 Ready for Pickup: Order #${shortId} - Apex Workwear`
    : (normalizedStatus === "shipped" || effectiveTrackingNum)
      ? `🚚 Shipped: Order #${shortId} Tracking Details - Apex Workwear`
      : `Order Update #${shortId}: ${statusText.replace(/_/g, " ").toUpperCase()} - Apex Workwear`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">APEX WORKWEAR &amp; PRINT</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Order Status Notification #${shortId}</p>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your order status has been updated to: <strong style="color: #2563eb; text-transform: uppercase;">${statusText.replace(/_/g, " ")}</strong>.</p>
        
        ${statusCalloutHtml}

        <p style="margin-top: 16px;">Thank you for choosing Apex Workwear &amp; Print!</p>
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p style="margin: 0 0 4px;">Apex Workwear &amp; Print &bull; 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1</p>
        <p style="margin: 0;">Need help? Call <a href="tel:6475701249" style="color: #2563eb; text-decoration: none;">(647) 570-1249</a> or email <a href="mailto:info@apexworkwear.ca" style="color: #2563eb; text-decoration: none;">info@apexworkwear.ca</a></p>
      </div>
    </div>
  `;

  return sendEmailWithFallback({
    to: customerEmail,
    subject: emailSubject,
    html,
    text: `Dear ${customerName},\n\nYour order #${shortId} status is now: ${statusText.replace(/_/g, " ").toUpperCase()}.\n${isReadyForPickup ? "\nPickup Location: 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1 | (647) 570-1249\n" : ""}${effectiveTrackingNum ? "\nTracking Number: " + effectiveTrackingNum : ""}${effectiveTrackingUrl ? "\nTrack URL: " + effectiveTrackingUrl : ""}\n\nThank you!`,
  });
}

export async function sendCustomOrderEmail(order, subject, messageText) {
  const addr = order.shippingAddress || {};
  const customerEmail = addr.ShipEmail || addr.email || order.userEmail;
  if (!customerEmail) return { success: false, error: "No customer email found" };

  const customerName = `${addr.ShipFName || "Valued"} ${addr.ShipLName || "Customer"}`.trim();
  const shortId = (order.id || "").substring(0, 8);

  const formattedMessage = (messageText || "").replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">APEX WORKWEAR &amp; PRINT</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Order #${shortId}</p>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <div style="margin: 16px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">
          ${formattedMessage}
        </div>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          Reference Order: <strong>#${shortId}</strong>
        </div>
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p style="margin: 0 0 4px;">Apex Workwear &amp; Print &bull; Premium Apparel &amp; Commercial Printing</p>
        <p style="margin: 0;">Need help? Email <a href="mailto:info@apexworkwear.ca" style="color: #2563eb; text-decoration: none;">info@apexworkwear.ca</a></p>
      </div>
    </div>
  `;

  return sendEmailWithFallback({
    to: customerEmail,
    subject: subject || `Regarding Order #${shortId} - Apex Workwear`,
    html,
    text: `Dear ${customerName},\n\n${messageText}\n\nReference Order #${shortId}\n\nApex Workwear & Print`,
  });
}

export async function sendAbandonedCheckoutRecoveryEmail({ order, templateId, discountCode, customSubject, customMessage }) {
  const addr = order.shippingAddress || {};
  const customerEmail = addr.ShipEmail || addr.email || order.userEmail;
  if (!customerEmail) return { success: false, error: "No customer email found on this abandoned order." };

  const customerName = `${addr.ShipFName || "Valued"} ${addr.ShipLName || "Customer"}`.trim();
  const shortId = (order.id || "").substring(0, 8);
  const checkoutUrl = order.stripeCheckoutUrl || "https://apexworkwear.ca/cart";
  const effectiveCode = discountCode || (templateId === "discount_10" ? "SAVE10" : templateId === "free_shipping" ? "FREESHIP" : "");

  let defaultSubject = "Complete your order with Apex Workwear";
  let contentHtml = "";

  if (templateId === "discount_10") {
    defaultSubject = `Take 10% Off Your Pending Order - Apex Workwear`;
    contentHtml = `
      <p>We noticed you started configuring an order with us but didn't get a chance to finish checkout.</p>
      <div style="background-color: #FEF3C7; border: 1.5px dashed #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: #92400E; display: block; margin-bottom: 4px;">Special Checkout Offer</span>
        <div style="font-size: 26px; font-weight: 900; color: #B45309; letter-spacing: 2px;">${effectiveCode}</div>
        <span style="font-size: 13px; color: #78350F; display: block; margin-top: 4px;">Use code <strong>${effectiveCode}</strong> at checkout for <strong>10% OFF</strong> your order!</span>
      </div>
      <p>Your items are safely saved and ready to enter production as soon as payment is confirmed.</p>
    `;
  } else if (templateId === "free_shipping") {
    defaultSubject = `Free Standard Shipping on Your Order - Apex Workwear`;
    contentHtml = `
      <p>Your custom print &amp; apparel items are waiting in your cart. We'd love to help you complete your project with complimentary shipping!</p>
      <div style="background-color: #EFF6FF; border: 1.5px dashed #3B82F6; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: #1E40AF; display: block; margin-bottom: 4px;">Free Shipping Voucher</span>
        <div style="font-size: 26px; font-weight: 900; color: #1D4ED8; letter-spacing: 2px;">${effectiveCode}</div>
        <span style="font-size: 13px; color: #1E3A8A; display: block; margin-top: 4px;">Enter <strong>${effectiveCode}</strong> for 100% Free Shipping on your delivery.</span>
      </div>
      <p>Lock in this promotion today and our Mississauga production team will queue your order for rapid turnaround.</p>
    `;
  } else {
    // Assistance / Personal Help template
    defaultSubject = `Can we help you with your order? - Apex Workwear`;
    contentHtml = `
      <p>We saw that you recently started configuring an order with us. Do you have questions about file setup, bleed margins, garment sizing, or turnaround times?</p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #0F172A;">Our Print &amp; Apparel Specialists Are Here:</p>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
          <li>Free artwork preflight verification and bleed checks</li>
          <li>Help selecting the right paper stock or garment fabric</li>
          <li>Custom volume quotes for large fleet orders</li>
        </ul>
      </div>
      <p>Simply reply directly to this email or call our workshop at <strong>(647) 570-1249</strong> and an associate will assist you immediately.</p>
    `;
  }

  if (customMessage && customMessage.trim()) {
    contentHtml += `
      <div style="margin-top: 16px; padding: 12px 16px; background-color: #F1F5F9; border-left: 4px solid #2563EB; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.5;">${customMessage.trim().replace(/\n/g, "<br/>")}</p>
      </div>
    `;
  }

  // Items summary preview
  let itemsHtml = "";
  if (Array.isArray(order.items) && order.items.length > 0) {
    itemsHtml = `
      <div style="margin-top: 20px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
        <div style="background-color: #F8FAFC; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">
          Items in Your Pending Order:
        </div>
        ${order.items.map(item => `
          <div style="padding: 10px 12px; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; font-size: 13px;">
            <div>
              <strong style="color: #0F172A;">${item.name || "Custom Print / Apparel Item"}</strong>
              ${item.optionSummary ? `<div style="font-size: 11px; color: #64748B;">${item.optionSummary}</div>` : ""}
            </div>
            <div style="text-align: right; color: #334155; font-weight: 700;">
              Qty: ${item.quantity || 1} &bull; $${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)} CAD
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  const finalSubject = customSubject && customSubject.trim() ? customSubject.trim() : defaultSubject;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">APEX WORKWEAR &amp; PRINT</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Pending Order Checkout Reminder</p>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        <p>Hi <strong>${customerName}</strong>,</p>
        ${contentHtml}
        ${itemsHtml}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${checkoutUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 800; font-size: 15px; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(37,99,235,0.25);">
            Complete Your Order Now &rarr;
          </a>
        </div>
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p style="margin: 0 0 4px;">Apex Workwear &amp; Print &bull; 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1</p>
        <p style="margin: 0;">Have questions? Reply directly to this email or call <a href="tel:6475701249" style="color: #2563eb; text-decoration: none;">(647) 570-1249</a>.</p>
      </div>
    </div>
  `;

  return sendEmailWithFallback({
    to: customerEmail,
    subject: finalSubject,
    html,
    text: `Hi ${customerName},\n\nComplete your pending order with Apex Workwear: ${checkoutUrl}\n\nCall (647) 570-1249 or reply to this email for assistance.`
  });
}
