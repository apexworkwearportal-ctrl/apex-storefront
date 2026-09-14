import { adminDb } from "@/lib/firebase-admin";
import { getProducts, getProductDetails, getPrice } from "@/lib/sinalite";
import crypto from "crypto";

export const maxDuration = 300; // Allow up to 5 minutes on Vercel for sync

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function GET(req) {
  return handleSync(req);
}

export async function POST(req) {
  return handleSync(req);
}

async function handleSync(req) {
  const syncId = crypto.randomUUID();
  const startedAt = new Date();
  
  // 1. Verify Secret
  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get("secret");
  const secretHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  
  let bearerToken = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  }
  
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && 
      secretParam !== expectedSecret && 
      secretHeader !== expectedSecret && 
      bearerToken !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized sync attempt" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!adminDb) {
    return new Response(
      JSON.stringify({ 
        error: "Firebase Admin is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in .env.local" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let productsProcessed = 0;
  let productsFailed = 0;
  const errors = [];
  const activeCategories = new Set();

  try {
    // 2. Fetch full product list from SinaLite
    const products = await getProducts();
    
    for (const product of products) {
      const productIdString = String(product.id);
      const productRef = adminDb.collection("products").doc(productIdString);
      
      if (product.enabled === 0) {
        // Auto-hide disabled products
        try {
          await productRef.set({
            sinalite: {
              sku: product.sku,
              name: product.name,
              category: product.category,
              enabled: 0,
            },
            isVisible: false,
            lastSyncedAt: new Date(),
          }, { merge: true });
          productsProcessed++;
        } catch (err) {
          productsFailed++;
          errors.push(`Failed to update disabled product ${product.id}: ${err.message}`);
        }
        continue;
      }
      
      // Sync basic details for enabled products
      try {
        // Track category
        if (product.category) {
          activeCategories.add(product.category);
        }
        
        // Fetch existing document to safely merge admin fields
        const existingDoc = await productRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        
        // Preserving admin fields (merging logic)
        const images = existingData.images || [];
        const shortDescription = existingData.shortDescription || "";
        const longDescription = existingData.longDescription || existingData.description || "";
        const description = existingData.description || "";
        const isVisible = existingData.isVisible !== undefined ? existingData.isVisible : true;
        const displayOrder = existingData.displayOrder !== undefined ? existingData.displayOrder : 0;
        const categoryOverride = existingData.categoryOverride || null;
        const startingPriceOverride = existingData.pricing?.startingPriceOverride || null;
        
        // Determine needsAttention
        const needsAttention = images.length === 0 || (!shortDescription && !longDescription && !description);
        
        const mergedProductData = {
          sinalite: {
            sku: product.sku,
            name: product.name,
            category: product.category,
            enabled: 1,
          },
          pricing: {
            startingPriceOverride,
            startingPrice: startingPriceOverride || 0,
            currency: "CAD",
            priceLastSyncedAt: new Date(),
          },
          images,
          shortDescription,
          longDescription,
          description,
          isVisible,
          needsAttention,
          displayOrder,
          categoryOverride,
          lastSyncedAt: new Date(),
        };
        
        await productRef.set(mergedProductData, { merge: true });
        productsProcessed++;
      } catch (err) {
        productsFailed++;
        errors.push(`Error syncing product ${product.id} (${product.name}): ${err.message}`);
      }
    }
    
    // 3. Derive categories and sync to categories collection
    for (const categoryName of activeCategories) {
      const slug = slugify(categoryName);
      if (!slug) continue;
      
      const categoryRef = adminDb.collection("categories").doc(slug);
      const existingCat = await categoryRef.get();
      
      if (!existingCat.exists) {
        await categoryRef.set({
          name: categoryName,
          description: "",
          heroImage: "",
          displayOrder: 0,
        });
      }
    }
    
    // Log success
    const finishedAt = new Date();
    const status = productsFailed === 0 ? "success" : "partial_success";
    
    await adminDb.collection("syncLogs").doc(syncId).set({
      startedAt,
      finishedAt,
      status,
      productsProcessed,
      productsFailed,
      errors,
    });
    
    return new Response(
      JSON.stringify({
        syncId,
        status,
        productsProcessed,
        productsFailed,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const finishedAt = new Date();
    errors.push(`Global sync failure: ${err.message}`);
    
    try {
      await adminDb.collection("syncLogs").doc(syncId).set({
        startedAt,
        finishedAt,
        status: "failed",
        productsProcessed,
        productsFailed,
        errors,
      });
    } catch (dbErr) {
      console.error("Failed to write error sync log to DB:", dbErr);
    }
    
    return new Response(
      JSON.stringify({
        syncId,
        status: "failed",
        productsProcessed,
        productsFailed,
        errors,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
