import { adminAuth } from "@/lib/firebase-admin";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  // 1. Verify admin permissions
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
      return Response.json({ error: "Unauthorized access" }, { status: 403 });
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
