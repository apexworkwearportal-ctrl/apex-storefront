import stripe, { getStripeConfig } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendOrderConfirmationEmail } from "@/lib/emails";
import { splitOrderIfNeeded } from "@/lib/order-splitter";
import { getLineTotal, getCartSubtotal, getTaxRate, computeTotals, round2 } from "@/lib/cart-pricing";

async function recordPromoUsage(order) {
  if (!order.promoCode || !order.promoCode.code || !adminDb) return;
  try {
    const promoCode = String(order.promoCode.code).trim().toUpperCase();
    const promoId = order.promoCode.id;
    const customerEmail = (order.shippingAddress?.ShipEmail || order.shippingAddress?.email || order.userEmail || "").trim().toLowerCase();
    const userId = order.userId && order.userId !== "guest" ? order.userId : null;

    const existing = await adminDb.collection("promoUsages")
      .where("orderId", "==", order.id)
      .limit(1)
      .get();

    if (existing.empty) {
      await adminDb.collection("promoUsages").add({
        promoCodeId: promoId || null,
        promoCode: promoCode,
        orderId: order.id,
        userId: userId,
        customerEmail: customerEmail,
        discountAmount: parseFloat(order.promoCode.discountAmount || 0),
        usedAt: new Date()
      });

      if (promoId) {
        await adminDb.collection("promoCodes").doc(promoId).update({
          usedCount: FieldValue.increment(1),
          updatedAt: new Date().toISOString()
        });
      } else {
        const pQuery = await adminDb.collection("promoCodes").where("code", "==", promoCode).limit(1).get();
        if (!pQuery.empty) {
          await pQuery.docs[0].ref.update({
            usedCount: FieldValue.increment(1),
            updatedAt: new Date().toISOString()
          });
        }
      }
      console.log(`✓ Recorded promo usage for ${promoCode} on order ${order.id}`);
    }
  } catch (err) {
    console.warn("Could not record promo usage:", err.message);
  }
}

function calculateTaxRate(province) {
  const p = province ? province.toUpperCase().trim() : "";
  if (["ON", "ONTARIO"].includes(p)) return 0.13;
  if (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(p)) return 0.15;
  return 0.05; // Standard GST for other provinces
}

async function saveAddressToUserIfNeeded(userId, shippingAddress) {
  if (!userId || userId === "guest" || !adminDb) return;
  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    let addresses = [];
    if (userDoc.exists && Array.isArray(userDoc.data()?.addresses)) {
      addresses = userDoc.data().addresses;
    }

    const addrStr = `${shippingAddress.ShipAddr} ${shippingAddress.ShipCity} ${shippingAddress.ShipZip}`.toLowerCase().trim().replace(/\s+/g, "");
    const exists = addresses.some(a => {
      const existingStr = `${a.addressLine1} ${a.city} ${a.zip}`.toLowerCase().trim().replace(/\s+/g, "");
      return existingStr === addrStr;
    });

    if (!exists) {
      const newAddress = {
        id: "addr_" + Date.now(),
        name: `${shippingAddress.ShipFName || ""} ${shippingAddress.ShipLName || ""}`.trim() || "Saved Shipping Address",
        addressLine1: shippingAddress.ShipAddr,
        addressLine2: shippingAddress.ShipAddr2 || "",
        city: shippingAddress.ShipCity,
        state: shippingAddress.ShipState,
        zip: shippingAddress.ShipZip,
        country: shippingAddress.ShipCountry || "CA",
        phone: shippingAddress.ShipPhone || "",
        isDefault: addresses.length === 0
      };

      addresses.push(newAddress);
      await userRef.set({ addresses, updatedAt: new Date() }, { merge: true });
      console.log(`✓ Auto-saved address '${newAddress.name}' for user ${userId}`);
    }
  } catch (err) {
    console.warn("Failed to auto-save address to user profile:", err);
  }
}

export async function POST(req) {
  try {
    const { items, shippingAddress, selectedShippingRate, userId, promoCode, isPickup, fulfillmentMethod } = await req.json();

    const pickupOrder = isPickup || fulfillmentMethod === "pickup";
    const effectiveShippingRate = pickupOrder 
      ? { serviceName: "Store Pickup (Free)", price: 0 }
      : selectedShippingRate;

    if (!items || items.length === 0 || !shippingAddress || !effectiveShippingRate) {
      return Response.json({ error: "Missing required checkout fields" }, { status: 400 });
    }

    // Auto-save shipping address into user document if logged in (for non-pickup orders)
    if (!pickupOrder) {
      await saveAddressToUserIfNeeded(userId, shippingAddress);
    }

    // 1. Calculate Totals (every component rounded to cents; grand total = sum of parts)
    const subtotalNum = getCartSubtotal(items);
    const discountRequested = promoCode && promoCode.discountAmount ? parseFloat(promoCode.discountAmount) : 0;
    const taxRate = getTaxRate(shippingAddress.ShipState || "ON");
    const computed = computeTotals({
      subtotal: subtotalNum,
      discount: discountRequested,
      shipping: parseFloat(effectiveShippingRate.price || 0),
      taxRate
    });
    const subtotal = computed.subtotal;
    const discountAmount = computed.discount;
    const discountedSubtotal = computed.discountedSubtotal;
    const shipping = computed.shipping;
    const tax = computed.tax;
    const grandTotal = computed.grandTotal;

    if (!(grandTotal > 0)) {
      return Response.json({ error: "Order total must be greater than $0.00." }, { status: 400 });
    }

    const orderData = {
      userId: userId || "guest",
      status: "payment_pending",
      paymentStatus: "pending",
      isPickup: pickupOrder,
      fulfillmentMethod: pickupOrder ? "pickup" : "shipping",
      pickupAddress: pickupOrder ? "1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1" : null,
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        isCustom: Boolean(i.isCustom),
        images: i.images || [],
        categoryId: i.categoryId || null,
        optionSummary: i.optionSummary || "",
        selectedOptionMap: i.selectedOptionMap || null,
        price: parseFloat(i.price || 0),
        quantity: parseInt(i.quantity || 1),
        lineTotal: getLineTotal(i),
        setupFee: parseFloat(i.setupFee || 0) || 0,
        isApparel: Boolean(i.isApparel),
        printMethod: i.printMethod || null,
        sizeBreakdown: i.sizeBreakdown || null,
        artworkFiles: i.artworkFiles || [],
        artworkUrl: i.artworkUrl || (i.artworkFiles && i.artworkFiles[0] ? i.artworkFiles[0].url : null),
        mockupLayers: i.mockupLayers || null,
        garmentViews: i.garmentViews || i.apparelViews || null,
        selectedSide: i.selectedSide || "front",
        logoUrl: i.logoUrl || null,
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
        ShipMethod: effectiveShippingRate.serviceName,
      },
      promoCode: promoCode ? {
        id: promoCode.id || null,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: discountAmount,
        scope: promoCode.scope || "site",
      } : null,
      totals: {
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      createdAt: new Date(),
    };

    // 2. Check Stripe Configuration dynamically
    const stripeConfig = await getStripeConfig();
    const activeStripe = stripeConfig.stripe || stripe;

    if (!stripeConfig.enabled || !activeStripe) {
      console.warn("Stripe is not configured or disabled in Admin Settings. Creating mock completed order.");
      
      if (!adminDb) {
        return Response.json({ error: "Firestore Admin is not configured" }, { status: 500 });
      }

      const mainOrderId = adminDb.collection("orders").doc().id;
      const baseOrder = {
        ...orderData,
        id: mainOrderId,
        status: "submitted",
        paymentStatus: "paid",
        paymentMethod: "mock_stripe",
      };

      // Split order on backend if mixed cart items (Print + Apparel)
      const splitOrders = splitOrderIfNeeded(baseOrder);

      for (const ord of splitOrders) {
        await adminDb.collection("orders").doc(ord.id).set(ord);
        try {
          await sendOrderConfirmationEmail(ord);
        } catch (emailErr) {
          console.error("Failed to send order email:", emailErr);
        }
      }

      // Record promo code usage
      await recordPromoUsage(baseOrder);

      return Response.json({ url: `/checkout/success?orderId=${mainOrderId}` });
    }

    // 3. Create Stripe Checkout Session
    const pendingRef = adminDb.collection("pendingOrders").doc();
    const origin = req.nextUrl.origin;
    
    // Construct Line Items for Stripe
    const lineItems = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: promoCode ? `Print Order Subtotal (${promoCode.code} Applied)` : "Print Order Subtotal",
            description: items.map(i => `${i.name} (x${i.quantity})`).join(", ") + (promoCode && discountAmount > 0 ? ` [Discount: -$${discountAmount.toFixed(2)}]` : ""),
          },
          unit_amount: Math.round(discountedSubtotal * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: pickupOrder ? "Fulfillment: Store Pickup (Free)" : `Shipping: ${effectiveShippingRate.serviceName}`,
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

    const customerEmail = shippingAddress.ShipEmail || shippingAddress.email || undefined;

    const session = await activeStripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${pendingRef.id}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        pendingOrderId: pendingRef.id,
        userId: userId || "guest",
        promoCode: promoCode ? promoCode.code : "",
      },
    });

    // 4. Save Pending Order with Stripe Checkout URL and Payment Pending Status
    await pendingRef.set({
      ...orderData,
      id: pendingRef.id,
      status: "payment_pending",
      paymentStatus: "pending",
      stripeSessionId: session.id,
      stripeCheckoutUrl: session.url,
      createdAt: new Date(),
    });

    return Response.json({ url: session.url, orderId: pendingRef.id });
  } catch (error) {
    console.error("Stripe Checkout Session creation failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
