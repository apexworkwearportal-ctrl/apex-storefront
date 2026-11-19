import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    if (!adminDb) {
      return Response.json({ items: [] });
    }

    const doc = await adminDb.collection("settings").doc("homepageFeatured").get();
    if (doc.exists && doc.data()?.items) {
      return Response.json({ items: doc.data().items });
    }

    return Response.json({ items: [] });
  } catch (err) {
    console.error("Error reading homepage featured settings:", err);
    return Response.json({ error: err.message || "Failed to load featured products" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items)) {
      return Response.json({ error: "Invalid items format" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database unavailable" }, { status: 500 });
    }

    await adminDb.collection("settings").doc("homepageFeatured").set({
      items,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return Response.json({ success: true, count: items.length });
  } catch (err) {
    console.error("Error saving homepage featured settings:", err);
    return Response.json({ error: err.message || "Failed to save featured products" }, { status: 500 });
  }
}

