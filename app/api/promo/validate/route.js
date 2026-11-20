import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { code, items = [], subtotal = 0, email, userId } = await req.json();

    if (!code || typeof code !== "string" || !code.trim()) {
      return Response.json({ valid: false, error: "Please enter a promo code." }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ valid: false, error: "Database service unavailable." }, { status: 500 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Query promoCode by code field
    const promoQuery = await adminDb.collection("promoCodes")
      .where("code", "==", cleanCode)
      .limit(1)
      .get();

    if (promoQuery.empty) {
      return Response.json({ valid: false, error: `Promo code "${cleanCode}" is invalid.` }, { status: 404 });
    }

    const promoDoc = promoQuery.docs[0];
    const promo = { id: promoDoc.id, ...promoDoc.data() };

    // 1. Check if promo is active
    if (promo.isActive === false) {
      return Response.json({ valid: false, error: "This promo code is currently inactive." }, { status: 400 });
    }

    // 2. Check Expiration Date
    if (promo.expiryDate) {
      const expiry = new Date(promo.expiryDate);
      // Set to end of expiry day
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) {
        return Response.json({ valid: false, error: "This promo code has expired." }, { status: 400 });
      }
    }

    // 3. Check Start Date if configured
    if (promo.startDate) {
      const start = new Date(promo.startDate);
      if (new Date() < start) {
        return Response.json({ valid: false, error: "This promo code is not active yet." }, { status: 400 });
      }
    }

    // 4. Check Site-Wide Total Usage Limit
    if (promo.maxSiteUses && typeof promo.maxSiteUses === "number" && promo.maxSiteUses > 0) {
      const currentUses = promo.usedCount || 0;
      if (currentUses >= promo.maxSiteUses) {
        return Response.json({ valid: false, error: "This promo code has reached its maximum total usage limit." }, { status: 400 });
      }
    }

    // 5. Check Per-Customer Usage Limit
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (promo.usageType === "one_per_customer" || (promo.usageType === "multiple_per_customer" && promo.perCustomerLimit)) {
      if (normalizedEmail || userId) {
        // Query usages for this promo code
        let usageCount = 0;

        if (normalizedEmail) {
          const emailUsages = await adminDb.collection("promoUsages")
            .where("promoCodeId", "==", promo.id)
            .where("customerEmail", "==", normalizedEmail)
            .get();
          usageCount = emailUsages.size;
        }

        if (userId && usageCount === 0) {
          const userUsages = await adminDb.collection("promoUsages")
            .where("promoCodeId", "==", promo.id)
            .where("userId", "==", userId)
            .get();
          usageCount = userUsages.size;
        }

        if (promo.usageType === "one_per_customer" && usageCount >= 1) {
          return Response.json({
            valid: false,
            error: "You have already used this promo code (limit 1 per customer)."
          }, { status: 400 });
        }

        if (promo.usageType === "multiple_per_customer" && promo.perCustomerLimit && usageCount >= promo.perCustomerLimit) {
          return Response.json({
            valid: false,
            error: `You have reached the maximum limit of ${promo.perCustomerLimit} use(s) for this promo code.`
          }, { status: 400 });
        }
      }
    }

    // 6. Check Minimum Order Subtotal
    const cartSubtotal = parseFloat(subtotal) || 0;
    if (promo.minOrderSubtotal && parseFloat(promo.minOrderSubtotal) > 0) {
      const minSub = parseFloat(promo.minOrderSubtotal);
      if (cartSubtotal < minSub) {
        return Response.json({
          valid: false,
          error: `Minimum order subtotal of $${minSub.toFixed(2)} CAD is required to use this code.`
        }, { status: 400 });
      }
    }

    // 7. Check Scope (site, category, product) and identify eligible items
    let eligibleItems = [];
    let eligibleSubtotal = 0;

    const scope = promo.scope || "site";

    if (scope === "site") {
      eligibleItems = items;
      eligibleSubtotal = items.reduce((acc, i) => acc + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
    } else if (scope === "category") {
      const allowedCategories = (promo.applicableCategoryIds || []).map(String);

      // If cart items don't have categoryId cached, look up from products collection
      const uncachedProductIds = items
        .filter(i => !i.categoryId)
        .map(i => String(i.productId));

      let productCategoryMap = {};
      if (uncachedProductIds.length > 0) {
        for (const pid of uncachedProductIds) {
          try {
            const pDoc = await adminDb.collection("products").doc(pid).get();
            if (pDoc.exists) {
              const pData = pDoc.data();
              productCategoryMap[pid] = String(pData.categoryId || pData.category || "");
            }
          } catch (e) {
            console.warn("Could not lookup product category:", pid, e.message);
          }
        }
      }

      for (const item of items) {
        const itemCatId = String(item.categoryId || productCategoryMap[String(item.productId)] || "");
        if (itemCatId && allowedCategories.includes(itemCatId)) {
          eligibleItems.push(item);
          eligibleSubtotal += parseFloat(item.price || 0) * (parseInt(item.quantity) || 1);
        }
      }

      if (eligibleItems.length === 0 || eligibleSubtotal <= 0) {
        return Response.json({
          valid: false,
          error: "This promo code is only valid for items in specific categories."
        }, { status: 400 });
      }
    } else if (scope === "product") {
      const allowedProducts = (promo.applicableProductIds || []).map(String);

      for (const item of items) {
        const pIdStr = String(item.productId);
        if (allowedProducts.includes(pIdStr)) {
          eligibleItems.push(item);
          eligibleSubtotal += parseFloat(item.price || 0) * (parseInt(item.quantity) || 1);
        }
      }

      if (eligibleItems.length === 0 || eligibleSubtotal <= 0) {
        return Response.json({
          valid: false,
          error: "This promo code is only valid for specific products."
        }, { status: 400 });
      }
    }

    // 8. Calculate Discount Amount
    let discountAmount = 0;
    const discountVal = parseFloat(promo.discountValue) || 0;

    if (promo.discountType === "percentage") {
      const pct = Math.min(100, Math.max(0, discountVal));
      discountAmount = (eligibleSubtotal * pct) / 100;
    } else {
      // Flat amount
      discountAmount = Math.min(discountVal, eligibleSubtotal);
    }

    // Round discount to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    if (discountAmount <= 0) {
      return Response.json({
        valid: false,
        error: "Discount calculation resulted in $0.00."
      }, { status: 400 });
    }

    return Response.json({
      valid: true,
      message: `Promo code "${cleanCode}" applied!`,
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description || "",
        discountType: promo.discountType,
        discountValue: discountVal,
        scope: promo.scope,
        discountAmount: discountAmount,
        eligibleSubtotal: Math.round(eligibleSubtotal * 100) / 100,
        usageType: promo.usageType || "one_per_customer"
      }
    });
  } catch (error) {
    console.error("Promo validation error:", error);
    return Response.json({ valid: false, error: error.message || "Failed to validate promo code." }, { status: 500 });
  }
}
