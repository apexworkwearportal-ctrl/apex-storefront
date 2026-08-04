import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      let config;
      // Handle base64 encoded or raw JSON
      if (serviceAccountKey.startsWith("{")) {
        config = JSON.parse(serviceAccountKey);
      } else {
        const decoded = Buffer.from(serviceAccountKey, "base64").toString("utf-8");
        config = JSON.parse(decoded);
      }

      admin.initializeApp({
        credential: admin.credential.cert(config),
      });
    } else {
      // Fallback for local development if default credentials are set or project ID is set
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apex-workwear",
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const adminDb = admin.apps.length ? admin.firestore() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

export { adminDb, adminAuth };
