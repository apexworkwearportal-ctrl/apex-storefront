import { adminDb } from "@/lib/firebase-admin";

const DEFAULT_APPAREL_TAXONOMIES = [
  { name: "T-Shirts", slug: "t-shirts", description: "Crewneck, v-neck, heavy cotton, and moisture-wicking tees", displayOrder: 1, isVisible: true },
  { name: "Hoodies & Sweatshirts", slug: "hoodies-sweatshirts", description: "Fleece pullovers, full-zip hooded jackets, and crewneck sweaters", displayOrder: 2, isVisible: true },
  { name: "Headwear & Caps", slug: "headwear-caps", description: "Structured snapbacks, dad hats, beanies, and trucker caps", displayOrder: 3, isVisible: true },
  { name: "Jackets & Outerwear", slug: "jackets-outerwear", description: "Windbreakers, softshells, workwear coats, and insulated outerwear", displayOrder: 4, isVisible: true },
  { name: "Polo Shirts", slug: "polo-shirts", description: "Pique knit and performance golf polos for professional uniforms", displayOrder: 5, isVisible: true },
  { name: "Safety Vests & High-Vis", slug: "safety-vests", description: "CSA/ANSI compliant high-visibility safety wear and construction gear", displayOrder: 6, isVisible: true },
  { name: "Bags & Accessories", slug: "bags-accessories", description: "Custom tote bags, backpacks, aprons, and branded merchandise", displayOrder: 7, isVisible: true },
];

export async function GET(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    // 1. Fetch apparel categories
    const catSnap = await adminDb.collection("apparel_categories").get();
    let categories = [];
    catSnap.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });

    // Auto-seed if completely empty
    if (categories.length === 0) {
      for (const item of DEFAULT_APPAREL_TAXONOMIES) {
        await adminDb.collection("apparel_categories").doc(item.slug).set({
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        categories.push({ id: item.slug, ...item });
      }
    }

    categories.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));

    // 2. Fetch product count per category
    const prodSnap = await adminDb.collection("apparel_products").get().catch(() => ({ forEach: () => {} }));
    const productCounts = {};
    prodSnap.forEach(doc => {
      const data = doc.data();
      const catName = data.category || data.categoryId || "Uncategorized";
      productCounts[catName] = (productCounts[catName] || 0) + 1;
      if (data.categoryId && data.categoryId !== catName) {
        productCounts[data.categoryId] = (productCounts[data.categoryId] || 0) + 1;
      }
    });

    return Response.json({ success: true, categories, productCounts });
  } catch (err) {
    console.error("Error fetching apparel categories via admin API:", err);
    return Response.json({ error: err.message || "Failed to load apparel categories" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const { action, category, id } = body;

    if (action === "seed") {
      for (const item of DEFAULT_APPAREL_TAXONOMIES) {
        await adminDb.collection("apparel_categories").doc(item.slug).set({
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      return Response.json({ success: true, message: "Default apparel categories seeded" });
    }

    if (!category || !category.name) {
      return Response.json({ error: "Category name is required" }, { status: 400 });
    }

    const docId = id || category.slug || category.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");

    const payload = {
      name: category.name.trim(),
      slug: category.slug || docId,
      description: category.description || "",
      heroImage: category.heroImage || "",
      displayOrder: Number(category.displayOrder) || 1,
      isVisible: category.isVisible !== false,
      saleDiscountPercent: Number(category.saleDiscountPercent) > 0 ? Number(category.saleDiscountPercent) : null,
      updatedAt: new Date().toISOString()
    };

    if (!id) {
      payload.createdAt = new Date().toISOString();
    }

    await adminDb.collection("apparel_categories").doc(docId).set(payload, { merge: true });

    return Response.json({ success: true, id: docId, category: { id: docId, ...payload } });
  } catch (err) {
    console.error("Error saving apparel category via admin API:", err);
    return Response.json({ error: err.message || "Failed to save category" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Category ID is required" }, { status: 400 });
    }

    await adminDb.collection("apparel_categories").doc(id).delete();
    return Response.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting apparel category via admin API:", err);
    return Response.json({ error: err.message || "Failed to delete category" }, { status: 500 });
  }
}

