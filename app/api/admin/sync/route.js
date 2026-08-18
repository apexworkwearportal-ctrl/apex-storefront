import { adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";

export async function POST(req) {
  // 1. Verify that the user is authenticated and is an admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const idToken = authHeader.substring(7);

  if (!adminAuth) {
    return Response.json({ error: "Firebase Admin is not configured" }, { status: 500 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userEmail = decodedToken.email;
    const userRole = decodedToken.role;

    const isAdmin = userRole === "admin" || 
                    userEmail === "admin@apexworkwear.ca" ||
                    userEmail.endsWith("@apexworkwear.ca");

    if (!isAdmin) {
      return Response.json({ error: "Unauthorized access: admin privileges required" }, { status: 403 });
    }

    // 2. Fetch the sync API route internally using the secret
    const origin = req.nextUrl.origin;
    const cronSecret = process.env.CRON_SECRET || "";
    
    console.log(`Internal admin-triggered sync starting. Origin: ${origin}`);
    
    const syncRes = await fetch(`${origin}/api/sync?secret=${cronSecret}`, {
      method: "POST",
      cache: "no-store",
    });

    const data = await syncRes.json();
    return Response.json(data, { status: syncRes.status });
  } catch (error) {
    console.error("Admin sync trigger failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
