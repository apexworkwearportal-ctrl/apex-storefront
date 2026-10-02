import { adminDb } from "@/lib/firebase-admin";

function generateRandomPromoCode(prefix = "APEX") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${randomPart}${yearSuffix}`.toUpperCase();
}

export async function GET(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await adminDb.collection("promoCodes")
      .orderBy("createdAt", "desc")
      .get();

    const promos = [];
    snapshot.forEach(doc => {
      promos.push({ id: doc.id, ...doc.data() });
    });

    return Response.json({ promos });
  } catch (error) {
    console.error("GET Admin Promos error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await req.json();
    let {
      code,
      autoGenerate = false,
      prefix = "APEX",
      description = "",
      discountType = "percentage", // "percentage" | "flat"
      discountValue = 10,
      scope = "site", // "site" | "category" | "product"
      applicableCategoryIds = [],
      applicableProductIds = [],
      usageType = "one_per_customer", // "one_per_customer" | "multiple_per_customer"
      perCustomerLimit = null,
      maxSiteUses = null,
      minOrderSubtotal = null,
      startDate = null,
      expiryDate = null,
      isActive = true
    } = body;

    // Resolve Code
    let finalCode = "";
    if (autoGenerate || !code || !code.trim()) {
      let attempts = 0;
      while (attempts < 5) {
        finalCode = generateRandomPromoCode(prefix || "APEX");
        const existing = await adminDb.collection("promoCodes")
          .where("code", "==", finalCode)
          .limit(1)
          .get();
        if (existing.empty) break;
        attempts++;
      }
    } else {
      finalCode = code.trim().toUpperCase().replace(/\s+/g, "");
      // Check if duplicate code exists
      const existing = await adminDb.collection("promoCodes")
        .where("code", "==", finalCode)
        .limit(1)
        .get();
      if (!existing.empty) {
        return Response.json({ error: `Promo code "${finalCode}" already exists. Please choose a different code.` }, { status: 400 });
      }
    }

    // Validate inputs
    const numDiscount = parseFloat(discountValue);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      return Response.json({ error: "Discount value must be greater than zero." }, { status: 400 });
    }

    if (discountType === "percentage" && numDiscount > 100) {
      return Response.json({ error: "Percentage discount cannot exceed 100%." }, { status: 400 });
    }

    if (scope === "category" && (!applicableCategoryIds || applicableCategoryIds.length === 0)) {
      return Response.json({ error: "Please select at least one category for category-wise promo code." }, { status: 400 });
    }

    if (scope === "product" && (!applicableProductIds || applicableProductIds.length === 0)) {
      return Response.json({ error: "Please select at least one product for product-wise promo code." }, { status: 400 });
    }

    const newPromo = {
      code: finalCode,
      description: description.trim(),
      discountType: discountType === "flat" ? "flat" : "percentage",
      discountValue: numDiscount,
      scope: ["site", "category", "product"].includes(scope) ? scope : "site",
      applicableCategoryIds: Array.isArray(applicableCategoryIds) ? applicableCategoryIds : [],
      applicableProductIds: Array.isArray(applicableProductIds) ? applicableProductIds.map(String) : [],
      usageType: usageType === "multiple_per_customer" ? "multiple_per_customer" : "one_per_customer",
      perCustomerLimit: usageType === "multiple_per_customer" && perCustomerLimit ? parseInt(perCustomerLimit) : null,
      maxSiteUses: maxSiteUses ? parseInt(maxSiteUses) : null,
      usedCount: 0,
      minOrderSubtotal: minOrderSubtotal ? parseFloat(minOrderSubtotal) : null,
      startDate: startDate || null,
      expiryDate: expiryDate || null,
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = adminDb.collection("promoCodes").doc();
    await docRef.set(newPromo);

    return Response.json({ success: true, promo: { id: docRef.id, ...newPromo } });
  } catch (error) {
    console.error("POST Admin Promos error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return Response.json({ error: "Promo code ID is required for updating" }, { status: 400 });
    }

    const promoRef = adminDb.collection("promoCodes").doc(id);
    const docSnap = await promoRef.get();
    if (!docSnap.exists) {
      return Response.json({ error: "Promo code not found" }, { status: 404 });
    }

    const updates = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase().replace(/\s+/g, "");
    }

    if (updates.discountValue) {
      updates.discountValue = parseFloat(updates.discountValue);
    }

    if (updates.minOrderSubtotal !== undefined) {
      updates.minOrderSubtotal = updates.minOrderSubtotal ? parseFloat(updates.minOrderSubtotal) : null;
    }

    if (updates.maxSiteUses !== undefined) {
      updates.maxSiteUses = updates.maxSiteUses ? parseInt(updates.maxSiteUses) : null;
    }

    if (updates.perCustomerLimit !== undefined) {
      updates.perCustomerLimit = updates.perCustomerLimit ? parseInt(updates.perCustomerLimit) : null;
    }

    await promoRef.update(updates);

    return Response.json({ success: true, message: "Promo code updated successfully" });
  } catch (error) {
    console.error("PUT Admin Promos error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const { id, isActive } = await req.json();

    if (!id) {
      return Response.json({ error: "Promo code ID is required" }, { status: 400 });
    }

    await adminDb.collection("promoCodes").doc(id).update({
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("PATCH Admin Promos error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing promo code ID" }, { status: 400 });
    }

    await adminDb.collection("promoCodes").doc(id).delete();
    return Response.json({ success: true, message: "Promo code deleted successfully" });
  } catch (error) {
    console.error("DELETE Admin Promos error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
