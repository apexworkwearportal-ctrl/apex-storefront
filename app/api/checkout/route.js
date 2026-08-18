import stripe from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { sendOrderConfirmationEmail } from "@/lib/emails";

function calculateTaxRate(province) {
  const p = province ? province.toUpperCase().trim() : "";
  if (["ON", "ONTARIO"].includes(p)) return 0.13;
  if (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(p)) return 0.15;
  return 0.05; // Standard GST for other provinces
}

export async function POST(req) {
  try {
    const { items, shippingAddress, selectedShippingRate, userId } = await req.json();

    if (!items || items.length === 0 || !shippingAddress || !selectedShippingRate) {
      return Response.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

    // 1. Calculate Totals
    const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    const shipping = parseFloat(selectedShippingRate.price || 0);
    const taxRate = calculateTaxRate(shippingAddress.ShipState);
    const tax = (subtotal + shipping) * taxRate;
    const grandTotal = subtotal + shipping + tax;

    const orderData = {
      userId: userId || "guest",
      status: "pending",
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        optionSummary: i.optionSummary,
        selectedOptionMap: i.selectedOptionMap,
        price: parseFloat(i.price),
        quantity: parseInt(i.quantity),
        artworkFiles: i.artworkFiles || [],
      })),
      shippingAddress: {
        ShipFName: shippingAddress.ShipFName,
        ShipLName: shippingAddress.ShipLName,
        ShipPhone: shippingAddress.ShipPhone,
        ShipEmail: shippingAddress.ShipEmail,
        ShipAddr: shippingAddress.ShipAddr,
        ShipAddr2: shippingAddress.ShipAddr2 || "",
        ShipCity: shippingAddress.ShipCity,
        ShipState: shippingAddress.ShipState,
        ShipZip: shippingAddress.ShipZip,
        ShipCountry: shippingAddress.ShipCountry,
        ShipMethod: selectedShippingRate.serviceName,
      },
      totals: {
        subtotal: subtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      createdAt: new Date(),
    };

    // 2. Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === "" || !stripe) {
      console.warn("Stripe is not configured in environment. Creating mock completed order.");
      
      if (!adminDb) {
        return Response.json({ error: "Firestore Admin is not configured" }, { status: 500 });
      }

      // Directly place order as "completed" or "submitted" for local testing
      const orderRef = adminDb.collection("orders").doc();
      const mockOrder = {
        ...orderData,
        id: orderRef.id,
        status: "submitted",
        paymentStatus: "paid",
        paymentMethod: "mock_stripe",
      };
      await orderRef.set(mockOrder);
      
      // Send confirmation email
      try {
        await sendOrderConfirmationEmail(mockOrder);
      } catch (emailErr) {
        console.error("Failed to send order email:", emailErr);
      }

      return Response.json({ url: `/checkout/success?orderId=${orderRef.id}` });
    }

    // 3. Create Pending Order in Firestore
    const pendingRef = adminDb.collection("pendingOrders").doc();
    await pendingRef.set({
      ...orderData,
      id: pendingRef.id,
    });

    // 4. Create Stripe Checkout Session
    const origin = req.nextUrl.origin;
    
    // Construct Line Items for Stripe
    // To make it simple and avoid decimals errors, we send subtotal, shipping, and tax as individual line items
    const lineItems = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: "Print Order Subtotal",
            description: items.map(i => `${i.name} (x${i.quantity})`).join(", "),
          },
          unit_amount: Math.round(subtotal * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `Shipping: ${selectedShippingRate.serviceName}`,
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `HST/GST Sales Tax`,
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${pendingRef.id}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        pendingOrderId: pendingRef.id,
        userId: userId || "guest",
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Session creation failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
