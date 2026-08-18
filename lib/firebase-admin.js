import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app;

if (getApps().length === 0) {
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

      app = initializeApp({
        credential: cert(config),
      });
    } else {
      // Fallback for local development if default credentials are set or project ID is set
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apex-workwear",
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
} else {
  app = getApp();
}

const adminDb = app ? getFirestore(app) : null;
const adminAuth = app ? getAuth(app) : null;

export { adminDb, adminAuth };
