// SinaLite API Client Helper

const SINALITE_API_URL = process.env.NODE_ENV === "production"
  ? (process.env.SINALITE_API_URL || "https://liveapi.sinalite.com")
  : (process.env.SINALITE_API_TEST_URL || "https://api.sinaliteuppy.com");

let cachedToken = null;
let tokenExpiryTime = 0;

/**
 * Get OAuth token from SinaLite
 */
async function getAuthToken() {
  const clientId = process.env.SINALITE_CLIENT_ID;
  const clientSecret = process.env.SINALITE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // If no credentials configured, proceed without a token (the mock server allows it)
    return null;
  }

  // Return cached token if valid
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${SINALITE_API_URL}/auth/token`, {
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
      console.warn("Failed to retrieve SinaLite auth token, continuing without it.");
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    // Set expiry minus 60 seconds buffer
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
  const headers = await getHeaders();
  const res = await fetch(`${SINALITE_API_URL}/product`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`SinaLite getProducts failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch options for a product
 */
export async function getProductDetails(productId) {
  const headers = await getHeaders();
  const res = await fetch(`${SINALITE_API_URL}/product/${productId}/en_ca`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`SinaLite getProductDetails failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch price for a product option combination
 */
export async function getPrice(productId, optionIds) {
  const headers = await getHeaders();
  const res = await fetch(`${SINALITE_API_URL}/price/${productId}/en_ca`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      productOptions: optionIds,
    }),
  });

  if (!res.ok) {
    throw new Error(`SinaLite getPrice failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get shipping estimates
 */
export async function getShippingEstimate(items, shippingInfo) {
  const headers = await getHeaders();
  const res = await fetch(`${SINALITE_API_URL}/order/shippingEstimate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      items,
      shippingInfo,
    }),
  });

  if (!res.ok) {
    throw new Error(`SinaLite getShippingEstimate failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Submit a new order
 */
export async function placeOrder(items, shippingInfo, billingInfo, notes) {
  const headers = await getHeaders();
  const res = await fetch(`${SINALITE_API_URL}/order/new`, {
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
    throw new Error(`SinaLite placeOrder failed: ${res.statusText}`);
  }

  return res.json();
}
