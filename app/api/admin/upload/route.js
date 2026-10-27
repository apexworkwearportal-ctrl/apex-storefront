import { adminAuth, adminDb } from "@/lib/firebase-admin";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  // 1. Verify admin permissions
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const idToken = authHeader.substring(7).trim();

  if (!adminAuth) {
    return Response.json({ error: "Firebase Admin is not configured" }, { status: 500 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();
    const userRole = decodedToken.role || decodedToken.admin;

    let isAdmin = userRole === "admin" || 
                  userRole === "superadmin" ||
                  userRole === true ||
                  userEmail === "admin@apexworkwear.ca" ||
                  userEmail === "apexworkwearportal@gmail.com" ||
                  userEmail.endsWith("@apexworkwear.ca");

    // If not verified via token or email, query user role from Firestore
    if (!isAdmin && adminDb && decodedToken.uid) {
      try {
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const role = userDoc.data()?.role;
          if (role === "admin" || role === "superadmin") {
            isAdmin = true;
          }
        }
      } catch (dbErr) {
        console.warn("Could not check Firestore user role:", dbErr);
      }
    }

    if (!isAdmin) {
      console.warn(`Unauthorized upload attempt from uid: ${decodedToken.uid}, email: ${userEmail}`);
      return Response.json({ error: "Unauthorized access: Administrator permissions required" }, { status: 403 });
    }

    // 2. Parse form file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "apex-storefront",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.write(buffer);
      stream.end();
    });

    return Response.json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
