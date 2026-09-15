import { getPrice } from "@/lib/sinalite";
import { adminDb } from "@/lib/firebase-admin";
import { getSitewisePricingSettings, calculateSellingPrice } from "@/lib/markup-engine";

export async function POST(req) {
  try {
    const { productId, optionIds, quantity } = await req.json();

    if (!productId || !optionIds || !Array.isArray(optionIds)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch raw base cost from SinaLite API
    const rawPriceData = await getPrice(productId, optionIds);
    
    // Safely parse raw base cost from various response formats
    let baseCost = 0;
    if (typeof rawPriceData === "number") {
      baseCost = rawPriceData;
    } else if (typeof rawPriceData?.price === "number") {
      baseCost = rawPriceData.price;
    } else if (typeof rawPriceData?.price === "string") {
      baseCost = parseFloat(rawPriceData.price) || 0;
    } else if (typeof rawPriceData?.amount === "number" || typeof rawPriceData?.amount === "string") {
      baseCost = parseFloat(rawPriceData.amount) || 0;
    } else if (typeof rawPriceData?.storePrice === "number" || typeof rawPriceData?.storePrice === "string") {
      baseCost = parseFloat(rawPriceData.storePrice) || 0;
    } else if (rawPriceData?.price && typeof rawPriceData.price === "object") {
      baseCost = parseFloat(rawPriceData.price.price || rawPriceData.price.amount || 0);
    }

    // Fetch Sitewise settings, Product doc, and Category doc from Firestore
    const sitewiseSettings = await getSitewisePricingSettings();
    let productDoc = null;
    let categoryDoc = null;

    if (adminDb) {
      try {
        const pSnap = await adminDb.collection("products").doc(String(productId)).get();
        if (pSnap.exists) {
          productDoc = pSnap.data();
        }

        // Determine category lookup key
        const categoryName = productDoc?.categoryOverride || productDoc?.sinalite?.category || null;
        const categoryId = productDoc?.categoryId || (categoryName ? categoryName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "") : null);

        if (categoryId) {
          const cSnap = await adminDb.collection("categories").doc(categoryId).get();
          if (cSnap.exists) {
            categoryDoc = cSnap.data();
          }
        }

        // Secondary fallback lookup by category name if slug mismatch
        if (!categoryDoc && categoryName) {
          const nameQuery = await adminDb.collection("categories").where("name", "==", categoryName).limit(1).get();
          if (!nameQuery.empty) {
            categoryDoc = nameQuery.docs[0].data();
          }
        }
      } catch (dbErr) {
        console.warn("Failed to fetch product/category for pricing lookup:", dbErr);
      }
    }

    const calculated = calculateSellingPrice({
      baseCost,
      quantity: quantity || 1,
      product: productDoc,
      category: categoryDoc,
      sitewiseSettings
    });

    return Response.json({
      ...rawPriceData,
      rawBaseCost: baseCost,
      price: calculated.finalPrice,
      markupPercent: calculated.markupPercent,
      markupAmount: calculated.markupAmount
    });
  } catch (error) {
    console.error("Live price query failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
