import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

function maskKey(key) {
  if (!key || key.length < 10) return "";
  const prefix = key.substring(0, 7);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

export async function GET() {
  try {
    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const snap = await adminDb.collection("settings").doc("stripe").get();
    if (!snap.exists) {
      return Response.json({
        enabled: false,
        mode: "test",
        testPublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        testSecretKey: process.env.STRIPE_SECRET_KEY ? maskKey(process.env.STRIPE_SECRET_KEY) : "",
        livePublishableKey: "",
        liveSecretKey: "",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? maskKey(process.env.STRIPE_WEBHOOK_SECRET) : "",
        hasEnvKeys: Boolean(process.env.STRIPE_SECRET_KEY),
        lastUpdated: null
      });
    }

    const data = snap.data();
    return Response.json({
      enabled: data.enabled !== undefined ? data.enabled : true,
      mode: data.mode || "test",
      testPublishableKey: data.testPublishableKey || "",
      testSecretKeyMasked: maskKey(data.testSecretKey),
      livePublishableKey: data.livePublishableKey || "",
      liveSecretKeyMasked: maskKey(data.liveSecretKey),
      webhookSecretMasked: maskKey(data.webhookSecret),
      hasTestSecretKey: Boolean(data.testSecretKey),
      hasLiveSecretKey: Boolean(data.liveSecretKey),
      hasWebhookSecret: Boolean(data.webhookSecret),
      hasEnvKeys: Boolean(process.env.STRIPE_SECRET_KEY),
      lastUpdated: data.updatedAt ? data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt : null
    });
  } catch (err) {
    console.error("GET Stripe Settings Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Firestore Admin is not initialized" }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // Handle connection test action
    if (action === "test") {
      const { secretKey } = body;
      if (!secretKey || !secretKey.startsWith("sk_")) {
        return Response.json({ success: false, error: "Invalid Stripe Secret Key format. Must start with 'sk_test_' or 'sk_live_'." }, { status: 400 });
      }

      try {
        const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
        const balance = await stripe.balance.retrieve();
        return Response.json({
          success: true,
          message: "Successfully connected to Stripe API!",
          currency: balance.available[0]?.currency?.toUpperCase() || "CAD",
          livemode: balance.livemode
        });
      } catch (stripeErr) {
        return Response.json({
          success: false,
          error: `Stripe API Error: ${stripeErr.message}`
        }, { status: 400 });
      }
    }

    // Save Settings
    const {
      enabled,
      mode,
      testPublishableKey,
      testSecretKey,
      livePublishableKey,
      liveSecretKey,
      webhookSecret
    } = body;

    const docRef = adminDb.collection("settings").doc("stripe");
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? existingSnap.data() : {};

    const updatePayload = {
      enabled: enabled !== undefined ? enabled : true,
      mode: mode || "test",
      testPublishableKey: testPublishableKey !== undefined ? testPublishableKey : (existing.testPublishableKey || ""),
      livePublishableKey: livePublishableKey !== undefined ? livePublishableKey : (existing.livePublishableKey || ""),
      updatedAt: new Date()
    };

    // Only update secret keys if non-empty value provided (don't overwrite with masked string)
    if (testSecretKey && !testSecretKey.includes("...")) {
      updatePayload.testSecretKey = testSecretKey.trim();
    }
    if (liveSecretKey && !liveSecretKey.includes("...")) {
      updatePayload.liveSecretKey = liveSecretKey.trim();
    }
    if (webhookSecret && !webhookSecret.includes("...")) {
      updatePayload.webhookSecret = webhookSecret.trim();
    }

    await docRef.set(updatePayload, { merge: true });

    return Response.json({
      success: true,
      message: "Stripe settings updated successfully in Firestore database."
    });
  } catch (err) {
    console.error("POST Stripe Settings Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
