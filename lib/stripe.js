import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Get active Stripe instance using Admin Firestore settings or process.env fallback.
 */
export async function getStripeConfig() {
  let secretKey = process.env.STRIPE_SECRET_KEY || "";
  let publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let mode = "test";
  let enabled = false;

  if (adminDb) {
    try {
      const snap = await adminDb.collection("settings").doc("stripe").get();
      if (snap.exists) {
        const data = snap.data();
        if (data.mode === "live") {
          secretKey = data.liveSecretKey || secretKey;
          publishableKey = data.livePublishableKey || publishableKey;
        } else {
          secretKey = data.testSecretKey || secretKey;
          publishableKey = data.testPublishableKey || publishableKey;
        }
        webhookSecret = data.webhookSecret || webhookSecret;
        mode = data.mode || "test";
        enabled = data.enabled !== undefined ? data.enabled : true;
      }
    } catch (err) {
      console.warn("Could not fetch Stripe settings from Firestore, using env variables:", err.message);
    }
  }

  const isValidKey = secretKey && secretKey.startsWith("sk_");
  const stripe = isValidKey ? new Stripe(secretKey, { apiVersion: "2023-10-16" }) : null;

  return {
    stripe,
    secretKey,
    publishableKey,
    webhookSecret,
    mode,
    enabled: enabled && isValidKey,
    isValidKey
  };
}

// Fallback default stripe client instance using env
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;
export default stripe;
