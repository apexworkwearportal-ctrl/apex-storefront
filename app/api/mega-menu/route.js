import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_MEGA_MENU } from "@/lib/mega-menu";

export async function GET() {
  try {
    if (!adminDb) {
      return Response.json({ menu: DEFAULT_MEGA_MENU });
    }

    const docSnap = await adminDb.collection("settings").doc("megaMenu").get();
    if (docSnap.exists && docSnap.data().items?.length > 0) {
      return Response.json({ menu: docSnap.data().items, updatedAt: docSnap.data().updatedAt });
    }

    return Response.json({ menu: DEFAULT_MEGA_MENU });
  } catch (error) {
    console.error("GET Mega Menu error:", error);
    return Response.json({ menu: DEFAULT_MEGA_MENU, error: error.message });
  }
}
