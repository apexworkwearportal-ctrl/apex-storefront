// Print Supplier API Client Helper

const SINALITE_API_URL = process.env.SINALITE_API_URL || 
  (process.env.SINALITE_USE_LIVE === "true" 
    ? "https://liveapi.sinalite.com" 
    : (process.env.SINALITE_API_TEST_URL || "https://api.sinaliteuppy.com"));

let cachedToken = null;
let tokenExpiryTime = 0;

/**
 * Get OAuth token from API provider
 */
async function getAuthToken() {
  const clientId = process.env.SINALITE_CLIENT_ID;
  const clientSecret = process.env.SINALITE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // If no credentials configured, proceed without a token (test sandbox environment)
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
      console.warn("Failed to retrieve print provider auth token, continuing with default access.");
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Error fetching print provider token:", error);
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
    throw new Error(`Print catalog service error: ${res.statusText}`);
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
    throw new Error(`Print product options query error: ${res.statusText}`);
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
    throw new Error(`Print pricing lookup error: ${res.statusText}`);
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
    throw new Error(`Shipping estimate calculation error: ${res.statusText}`);
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
    throw new Error(`Order submission error: ${res.statusText}`);
  }

  return res.json();
}
