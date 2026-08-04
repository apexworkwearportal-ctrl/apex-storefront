import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_secret_key", {
  apiVersion: "2023-10-16", // use standard/recent stable version
});

export default stripe;
