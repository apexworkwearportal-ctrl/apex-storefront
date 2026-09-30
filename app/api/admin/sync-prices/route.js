import { adminDb } from "@/lib/firebase-admin";
import { getProductDetails, getPrice } from "@/lib/sinalite";
import { getSitewisePricingSettings, calculateSellingPrice } from "@/lib/markup-engine";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

export const maxDuration = 300;

async function verifyAdmin(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const idToken = authHeader.substring(7).trim();

  try {
    if (!getApps().length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
      initializeApp({ credential: cert(serviceAccount) });
    }
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!adminDb) return false;
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) return false;
    const role = userSnap.data()?.role;
    return role === "admin" || role === "superadmin";
  } catch {
    return false;
  }
}

/**
 * Detect the type of an option group from its name.
 * Returns: "quantity" | "turnaround" | "default"
 */
function classifyGroup(groupName) {
  const lower = groupName.toLowerCase();
  if (lower.includes("qty") || lower.includes("quantity") || lower.includes("copies") || lower.includes("pieces") || lower.includes("units")) {
    return "quantity";
  }
  if (lower.includes("turnaround") || lower.includes("delivery") || lower.includes("rush") || lower.includes("business day") || lower.includes("days")) {
    return "turnaround";
  }
  return "default";
}

/**
 * Parse a numeric quantity from an option name like "100", "100 pieces", "1,000 copies", etc.
 * Returns Infinity if no number can be parsed.
 */
function parseQtyFromName(name) {
  if (!name) return Infinity;
  const cleaned = name.replace(/,/g, "");
  const match = cleaned.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

/**
 * Given a list of visible options for a group, pick the best one for "starting from" price:
 *  - quantity:   sort ascending by parsed qty, pick the FIRST (smallest qty = floor price)
 *  - turnaround: pick the LAST option (slowest = cheapest)
 *  - default:    pick the FIRST option
 */
function pickBestOption(groupName, opts) {
  if (!opts || opts.length === 0) return null;
  const type = classifyGroup(groupName);

  if (type === "quantity") {
    // Sort ascending by numeric quantity in the name, pick smallest
    const sorted = [...opts].sort((a, b) => parseQtyFromName(a.name) - parseQtyFromName(b.name));
    return sorted[0];
  }

  if (type === "turnaround") {
    // Last option = slowest turnaround = cheapest
    return opts[opts.length - 1];
  }

  // Default: first visible option
  return opts[0];
}

function pickMinimalOptions(productDetails) {
  if (!productDetails) return null;

  // Flatten array if wrapped like [[ {...}, {...} ]] or [{...}]
  let list = [];
  if (Array.isArray(productDetails)) {
    if (productDetails.length > 0 && Array.isArray(productDetails[0])) {
      list = productDetails[0];
    } else {
      list = productDetails;
    }
  } else if (typeof productDetails === "object") {
    list =
      productDetails.optionGroups ||
      productDetails.options ||
      productDetails.productOptions ||
      productDetails.groups ||
      [];
  }

  if (!Array.isArray(list) || list.length === 0) return null;

  // If list contains option objects with .group / .hidden properties (SinaLite standard format)
  const firstItem = list[0];
  if (firstItem && typeof firstItem === "object" && ("group" in firstItem || "name" in firstItem || "id" in firstItem)) {
    const grouped = {};
    for (const opt of list) {
      if (!opt) continue;
      // Skip hidden options
      if (opt.hidden === 1) continue;

      const groupName = opt.group || "Default";
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(opt);
    }

    const selected = [];
    for (const groupName of Object.keys(grouped)) {
      const opts = grouped[groupName];
      const chosenOpt = pickBestOption(groupName, opts);
      if (chosenOpt) {
        const optId = chosenOpt.id ?? chosenOpt.optionId ?? chosenOpt.value;
        if (optId !== undefined && optId !== null) {
          selected.push(optId);
        }
      }
    }

    if (selected.length > 0) return selected;
  }

  // Fallback: If list is an array of group objects { name, options: [...] }
  const selected = [];
  for (const group of list) {
    if (!group) continue;
    const opts = group.options || group.items || group.values || (Array.isArray(group) ? group : []);
    if (!Array.isArray(opts) || opts.length === 0) continue;
    const groupName = group.name || group.group || "";
    const chosen = pickBestOption(groupName, opts);
    const id = chosen?.id ?? chosen?.optionId ?? chosen?.value ?? (typeof chosen === "number" || typeof chosen === "string" ? chosen : null);
    if (id !== undefined && id !== null) selected.push(id);
  }

  return selected.length > 0 ? selected : null;
}

function parseRawBaseCost(raw) {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw?.price === "number") return raw.price;
  if (typeof raw?.price === "string") return parseFloat(raw.price) || 0;
  if (typeof raw?.amount === "number") return raw.amount;
  if (typeof raw?.amount === "string") return parseFloat(raw.amount) || 0;
  if (typeof raw?.storePrice === "number") return raw.storePrice;
  if (typeof raw?.storePrice === "string") return parseFloat(raw.storePrice) || 0;
  if (raw?.price && typeof raw.price === "object") {
    return parseFloat(raw.price.price || raw.price.amount || 0);
  }
  return 0;
}

export async function POST(req) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return Response.json({ error: "Firebase Admin not initialized" }, { status: 500 });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
    } catch (e) {
      // client disconnected
    }
  };

  (async () => {
    const results = [];
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const sitewiseSettings = await getSitewisePricingSettings();

      const productsSnap = await adminDb.collection("products")
        .where("sinalite.enabled", "==", 1)
        .get();

      const products = [];
      productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

      await sendEvent({ type: "init", total: products.length });

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productId = product.id;
        const productName = product.sinalite?.name || productId;
        let itemResult = null;

        if (product.pricing?.startingPriceOverride > 0) {
          skipped++;
          itemResult = { id: productId, name: productName, status: "skipped", reason: "Has manual override" };
        } else {
          try {
            const details = await getProductDetails(productId);
            const minOptions = pickMinimalOptions(details);

            if (!minOptions) {
              failed++;
              itemResult = { id: productId, name: productName, status: "failed", reason: "Could not determine option set" };
            } else {
              const rawPriceData = await getPrice(productId, minOptions);
              const baseCost = parseRawBaseCost(rawPriceData);

              if (!baseCost || baseCost <= 0) {
                failed++;
                itemResult = { id: productId, name: productName, status: "failed", reason: `Invalid base cost: ${JSON.stringify(rawPriceData).substring(0, 100)}` };
              } else {
                let categoryDoc = null;
                let parentCategoryDoc = null;
                const categoryName = product.categoryOverride || product.sinalite?.category || null;
                const categoryId = product.categoryId || (categoryName
                  ? categoryName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")
                  : null);

                if (categoryId) {
                  try {
                    const cSnap = await adminDb.collection("categories").doc(categoryId).get();
                    if (cSnap.exists) {
                      categoryDoc = cSnap.data();
                      if (categoryDoc?.parentId) {
                        const pSnap = await adminDb.collection("categories").doc(categoryDoc.parentId).get();
                        if (pSnap.exists) parentCategoryDoc = pSnap.data();
                      }
                    }
                  } catch (e) {}
                }

                const calculated = calculateSellingPrice({
                  baseCost,
                  quantity: 1,
                  product,
                  category: categoryDoc,
                  parentCategory: parentCategoryDoc,
                  sitewiseSettings
                });

                await adminDb.collection("products").doc(productId).set({
                  pricing: {
                    startingPrice: calculated.finalPrice,
                    rawBaseCost: baseCost,
                    markupPercent: calculated.markupPercent,
                    priceLastCalculatedAt: new Date(),
                    currency: "CAD"
                  }
                }, { merge: true });

                updated++;
                itemResult = {
                  id: productId,
                  name: productName,
                  status: "updated",
                  baseCost: baseCost.toFixed(2),
                  markupPercent: calculated.markupPercent,
                  startingPrice: calculated.finalPrice.toFixed(2)
                };
              }
            }
          } catch (err) {
            failed++;
            itemResult = { id: productId, name: productName, status: "failed", reason: err.message };
          }
        }

        results.push(itemResult);

        await sendEvent({
          type: "progress",
          current: i + 1,
          total: products.length,
          product: itemResult
        });

        await new Promise(r => setTimeout(r, 150));
      }

      await sendEvent({
        type: "complete",
        summary: { total: products.length, updated, failed, skipped },
        results
      });
    } catch (err) {
      console.error("sync-prices error:", err);
      await sendEvent({ type: "error", error: err.message });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}
