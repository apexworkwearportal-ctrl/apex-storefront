// Print Supplier API Client Helper
import { adminDb } from "@/lib/firebase-admin";

let cachedToken = null;
let tokenExpiryTime = 0;

async function getSinaliteConfig() {
  let clientId 
  let clientSecret 
  let useLiveApi
  let customUrl 

  if ((!clientId || !clientSecret) && adminDb) {
    try {
      const snap = await adminDb.collection("settings").doc("fulfillment").get();
      if (snap.exists) {
        const data = snap.data();
        if (data.clientId) clientId = data.clientId;
        if (data.clientSecret) clientSecret = data.clientSecret;
        if (data.useLiveApi !== undefined) useLiveApi = !!data.useLiveApi;
        if (data.apiUrl) customUrl = data.apiUrl;
      }
    } catch (e) {
      console.warn("Could not load fulfillment settings from Firestore:", e.message);
    }
  }

  const apiUrl = customUrl || (useLiveApi ? "https://liveapi.sinalite.com" : "https://api.sinaliteuppy.com");

  return { clientId, clientSecret, useLiveApi, apiUrl };
}

/**
 * Get OAuth token from API provider
 */
async function getAuthToken() {
  const config = await getSinaliteConfig();
  const { clientId, clientSecret, apiUrl } = config;

  if (!clientId || !clientSecret) {
    console.warn("SinaLite API credentials (CLIENT_ID / CLIENT_SECRET) are missing.");
    return null;
  }

  // Return cached token if valid
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${apiUrl}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: "https://apiconnect.sinalite.com",
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("Failed to retrieve SinaLite auth token:", res.status, errBody);
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Error fetching SinaLite token:", error);
    return null;
  }
}

/**
 * Generate Authorization Headers
 */
async function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch all products
 */
export async function getProducts() {
  const config = await getSinaliteConfig();
  const headers = await getHeaders();
  const res = await fetch(`${config.apiUrl}/product`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Print catalog query failed (${res.status}): ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch options for a product
 */
export async function getProductDetails(productId) {
  const config = await getSinaliteConfig();
  const headers = await getHeaders();
  const res = await fetch(`${config.apiUrl}/product/${productId}/en_ca`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Print product options query failed (${res.status}): ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch price for a product option combination
 */
export async function getPrice(productId, optionIds) {
  const config = await getSinaliteConfig();
  const headers = await getHeaders();
  const res = await fetch(`${config.apiUrl}/price/${productId}/en_ca`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      productOptions: optionIds,
    }),
  });

  if (!res.ok) {
    throw new Error(`Print pricing query failed (${res.status}): ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get shipping estimates
 */
export async function getShippingEstimate(items, shippingInfo) {
  const config = await getSinaliteConfig();
  const headers = await getHeaders();
  console.log(config.apiUrl )
  const res = await fetch(`${config.apiUrl}/order/shippingEstimate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      items:items,
      shippingInfo,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shipping estimate calculation failed (${res.status}): ${res.statusText}`);
  }

  return res.json();
}

/**
 * Submit a new order
 */
export async function placeOrder(items, shippingInfo, billingInfo, notes) {
  const config = await getSinaliteConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error("SinaLite API Credentials Missing: Please set your Client ID and Client Secret in Admin Settings → Fulfillment Settings.");
  }

  const headers = await getHeaders();
  if (!headers["Authorization"]) {
    throw new Error("SinaLite Authentication Failed: Invalid Client ID or Client Secret credentials. Please verify keys in Admin Settings.");
  }

  const res = await fetch(`${config.apiUrl}/order/new`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      items,
      shippingInfo,
      billingInfo,
      notes,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("SinaLite placeOrder failed with status:", res.status, errorText);
    if (errorText.includes("credentials_required") || res.status === 401 || (res.status === 500 && errorText.includes("auth"))) {
      throw new Error("SinaLite Authentication Failed: Invalid credentials. Please check your Client ID & Secret in Admin Settings.");
    }
    throw new Error(`Order submission failed (${res.status}): ${errorText.substring(0, 150)}`);
  }

  return res.json();
}
