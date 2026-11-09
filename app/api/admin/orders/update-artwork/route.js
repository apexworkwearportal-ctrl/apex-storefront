import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { orderId, itemIndex, artworkFiles } = await req.json();

    if (!orderId) {
      return Response.json({ error: "Missing order ID" }, { status: 400 });
    }

    if (itemIndex === undefined || itemIndex === null || !Array.isArray(artworkFiles)) {
      return Response.json({ error: "Missing item index or artwork files array" }, { status: 400 });
    }

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    const items = [...(orderData.items || [])];

    if (!items[itemIndex]) {
      return Response.json({ error: "Item index out of bounds" }, { status: 400 });
    }

    // Update the item's artworkFiles and fallback artworkUrl
    const updatedItem = {
      ...items[itemIndex],
      artworkFiles: artworkFiles,
      artworkUrl: artworkFiles[0]?.url || items[itemIndex].artworkUrl || null,
      artworkModifiedByAdmin: true,
      artworkModifiedAt: new Date().toISOString()
    };

    items[itemIndex] = updatedItem;

    // Track order-level modification timestamp
    const updatePayload = {
      items,
      artworkLastModifiedAt: new Date().toISOString()
    };

    await orderRef.update(updatePayload);

    return Response.json({
      success: true,
      message: "Artwork files updated successfully.",
      items
    });
  } catch (error) {
    console.error("Failed to update order artwork:", error);
    return Response.json({ error: error.message || "Failed to update artwork" }, { status: 500 });
  }
}

