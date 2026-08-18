import stripe from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { placeOrder } from "@/lib/sinalite";
import { sendOrderConfirmationEmail } from "@/lib/emails";

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  
  let event;
  try {
    const rawBody = await req.text();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripe) {
      throw new Error("Stripe SDK is not initialized.");
    }
    
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle payment completion event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const pendingOrderId = session.metadata?.pendingOrderId;

    console.log(`Stripe webhook received checkout.session.completed. Pending order ID: ${pendingOrderId}`);

    if (pendingOrderId && adminDb) {
      try {
        const pendingRef = adminDb.collection("pendingOrders").doc(pendingOrderId);
        const pendingSnap = await pendingRef.get();

        if (pendingSnap.exists) {
          const pendingOrder = pendingSnap.data();
          
          // Submit finalized order details directly to SinaLite API
          let sinaliteOrderId = null;
          try {
            const sinaliteRes = await placeOrder(pendingOrder.shippingAddress, pendingOrder.items);
            if (sinaliteRes && sinaliteRes.orderId) {
              sinaliteOrderId = sinaliteRes.orderId;
            }
          } catch (err) {
            console.error("SinaLite automatic order placement failed:", err);
          }

          // Write final order document to the "orders" collection in Firestore
          const finalOrder = {
            ...pendingOrder,
            status: sinaliteOrderId ? "submitted" : "pending_submission",
            sinaliteOrderId,
            paymentStatus: "paid",
            stripeSessionId: session.id,
            paidAt: new Date(),
          };

          const orderRef = adminDb.collection("orders").doc(pendingOrderId);
          await orderRef.set(finalOrder);

          // Send confirmation email
          try {
            await sendOrderConfirmationEmail(finalOrder);
          } catch (emailErr) {
            console.error("Failed to send order email:", emailErr);
          }

          // Delete the pending order reference
          await pendingRef.delete();
          console.log(`Successfully completed and submitted order: ${pendingOrderId}`);
        } else {
          console.error(`Pending order document not found for ID: ${pendingOrderId}`);
        }
      } catch (err) {
        console.error("Error processing completed order in webhook:", err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
