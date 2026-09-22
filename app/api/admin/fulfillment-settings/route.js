import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    let settings = {
      autoSubmitSinalite: false,
      clientId: "",
      clientSecretMasked: "",
      useLiveApi: false,
      hasClientId: false,
      hasClientSecret: false
    };

    if (adminDb) {
      const snap = await adminDb.collection("settings").doc("fulfillment").get();
      if (snap.exists) {
        const data = snap.data();
        const secret = data.clientSecret || process.env.SINALITE_CLIENT_SECRET || "";
        const cId = data.clientId || process.env.SINALITE_CLIENT_ID || "";
        
        settings = {
          autoSubmitSinalite: !!data.autoSubmitSinalite,
          clientId: cId,
          clientSecretMasked: secret ? `${secret.substring(0, 4)}••••••••${secret.substring(Math.max(0, secret.length - 4))}` : "",
          useLiveApi: !!data.useLiveApi,
          hasClientId: !!cId,
          hasClientSecret: !!secret
        };
      } else {
        const secret = process.env.SINALITE_CLIENT_SECRET || "";
        const cId = process.env.SINALITE_CLIENT_ID || "";
        settings.clientId = cId;
        settings.clientSecretMasked = secret ? `${secret.substring(0, 4)}••••••••${secret.substring(Math.max(0, secret.length - 4))}` : "";
        settings.hasClientId = !!cId;
        settings.hasClientSecret = !!secret;
        settings.useLiveApi = process.env.SINALITE_USE_LIVE === "true";
      }
    }

    return Response.json(settings);
  } catch (err) {
    console.error("Error fetching fulfillment settings:", err);
    return Response.json({ autoSubmitSinalite: false });
  }
}

export async function POST(req) {
  try {
    const { autoSubmitSinalite, clientId, clientSecret, useLiveApi } = await req.json();

    if (!adminDb) {
      return Response.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const payload = {
      autoSubmitSinalite: !!autoSubmitSinalite,
      useLiveApi: !!useLiveApi,
      updatedAt: new Date()
    };

    if (clientId !== undefined) {
      payload.clientId = clientId.trim();
    }

    // Only update clientSecret if passed and not masked placeholder
    if (clientSecret && !clientSecret.includes("••••")) {
      payload.clientSecret = clientSecret.trim();
    }

    await adminDb.collection("settings").doc("fulfillment").set(payload, { merge: true });

    return Response.json({ 
      success: true, 
      message: "Fulfillment API settings saved successfully!"
    });
  } catch (err) {
    console.error("Error updating fulfillment settings:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
