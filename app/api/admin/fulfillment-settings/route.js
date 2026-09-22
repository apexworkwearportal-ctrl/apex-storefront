import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    let autoSubmitSinalite = false;

    if (adminDb) {
      const snap = await adminDb.collection("settings").doc("fulfillment").get();
      if (snap.exists) {
        autoSubmitSinalite = !!snap.data().autoSubmitSinalite;
      }
    }

    return Response.json({ autoSubmitSinalite });
  } catch (err) {
    console.error("Error fetching fulfillment settings:", err);
    return Response.json({ autoSubmitSinalite: false });
  }
}

export async function POST(req) {
  try {
    const { autoSubmitSinalite } = await req.json();

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    await adminDb.collection("settings").doc("fulfillment").set({
      autoSubmitSinalite: !!autoSubmitSinalite,
      updatedAt: new Date()
    }, { merge: true });

    return Response.json({ 
      success: true, 
      autoSubmitSinalite: !!autoSubmitSinalite,
      message: `Automatic SinaLite submission set to ${autoSubmitSinalite ? "ENABLED" : "DISABLED"}`
    });
  } catch (err) {
    console.error("Error updating fulfillment settings:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
