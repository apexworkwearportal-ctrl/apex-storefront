import { adminDb } from "@/lib/firebase-admin";

export async function GET(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const snap = await adminDb.collection("apparel_products").get();
    const list = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });

    list.sort((a, b) => {
      const timeA = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (a.name || "").localeCompare(b.name || "");
    });

    return Response.json({ success: true, products: list });
  } catch (err) {
    console.error("Error loading apparel products via admin API:", err);
    return Response.json({ error: err.message || "Failed to load apparel products" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const { id, product } = await req.json();

    if (!product || !product.name) {
      return Response.json({ error: "Product name is required" }, { status: 400 });
    }

    const docId = id || adminDb.collection("apparel_products").doc().id;

    const payload = {
      ...product,
      updatedAt: new Date().toISOString()
    };

    if (!id) {
      payload.createdAt = new Date().toISOString();
    }

    await adminDb.collection("apparel_products").doc(docId).set(payload, { merge: true });

    return Response.json({ success: true, id: docId, product: { id: docId, ...payload } });
  } catch (err) {
    console.error("Error saving apparel product via admin API:", err);
    return Response.json({ error: err.message || "Failed to save apparel product" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    if (!adminDb) {
      return Response.json({ error: "Admin database unavailable" }, { status: 500 });
    }

    const { id, isVisible } = await req.json();

    if (!id) {
      return Response.json({ error: "Product ID is required" }, { status: 400 });
    }

    await adminDb.collection("apparel_products").doc(id).update({
      isVisible: !!isVisible,
      updatedAt: new Date().toISOString()
    });

    return Response.json({ success: true, id, isVisible: !!isVisible });
  } catch (err) {
    console.error("Error updating apparel visibility via admin API:", err);
    return Response.json({ error: err.message || "Failed to update visibility" }, { status: 500 });
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
      return Response.json({ error: "Product ID is required" }, { status: 400 });
    }

    await adminDb.collection("apparel_products").doc(id).delete();

    return Response.json({ success: true, id });
  } catch (err) {
    console.error("Error deleting apparel product via admin API:", err);
    return Response.json({ error: err.message || "Failed to delete apparel product" }, { status: 500 });
  }
}

