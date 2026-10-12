import stripe, { getStripeConfig } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    // 1. Check if already completed and paid in orders collection
    const paidSnap = await adminDb.collection("orders").doc(orderId).get();
    if (paidSnap.exists) {
      const paidData = paidSnap.data();
      if (paidData.paymentStatus === "paid" || paidData.status !== "payment_pending") {
        return Response.json({ 
          alreadyPaid: true, 
          message: "This order has already been paid.", 
          orderId 
        });
      }
    }

    // 2. Fetch from pendingOrders collection
    const pendingRef = adminDb.collection("pendingOrders").doc(orderId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return Response.json({ error: "Pending order not found or already completed." }, { status: 404 });
    }

    const order = pendingSnap.data();

    // 3. Check Stripe Configuration dynamically
    const stripeConfig = await getStripeConfig();
    const activeStripe = stripeConfig.stripe || stripe;

    if (!stripeConfig.enabled || !activeStripe) {
      return Response.json({ error: "Payment processor is currently not configured or disabled." }, { status: 500 });
    }

    // 4. Try existing Stripe session first if still open
    if (order.stripeSessionId) {
      try {
        const existingSession = await activeStripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (existingSession && existingSession.status === "open" && existingSession.url) {
          return Response.json({ url: existingSession.url, sessionId: existingSession.id });
        }
      } catch (sessErr) {
        console.warn("Existing Stripe session not open or expired, creating fresh session:", sessErr.message);
      }
    }

    // 5. Generate fresh Stripe Checkout Session for this order
    const origin = req.nextUrl.origin;
    const totals = order.totals || {};
    const discountedSubtotal = parseFloat(totals.discountedSubtotal || totals.subtotal || 0);
    const shipping = parseFloat(totals.shipping || 0);
    const tax = parseFloat(totals.tax || 0);

    const lineItems = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: order.promoCode ? `Print Order (${order.promoCode.code} Applied)` : "Print Order Subtotal",
            description: (order.items || []).map(i => `${i.name} (x${i.quantity})`).join(", "),
          },
          unit_amount: Math.round(discountedSubtotal * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `Shipping: ${order.shippingAddress?.ShipMethod || "Standard"}`,
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: "HST/GST Sales Tax",
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      },
    ];

    const customerEmail = order.shippingAddress?.ShipEmail || order.shippingAddress?.email || undefined;

    const newSession = await activeStripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancel_url: `${origin}/account?tab=orders`,
      metadata: {
        pendingOrderId: orderId,
        userId: order.userId || "guest",
        promoCode: order.promoCode ? order.promoCode.code : "",
      },
    });

    // Update pending order with new session details
    await pendingRef.update({
      stripeSessionId: newSession.id,
      stripeCheckoutUrl: newSession.url,
      updatedAt: new Date()
    });

    return Response.json({ url: newSession.url, sessionId: newSession.id });
  } catch (error) {
    console.error("Resume checkout error:", error);
    return Response.json({ error: error.message || "Failed to resume checkout." }, { status: 500 });
  }
}
