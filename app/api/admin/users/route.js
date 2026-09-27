import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdminToken(req) {
  if (!adminAuth) throw new Error("Firebase Admin SDK not initialized.");
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized access.");
  }

  const token = authHeader.split("Bearer ")[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  // Verify Admin privilege
  const email = decodedToken.email || "";
  const isAdmin = decodedToken.admin === true || 
                  decodedToken.role === "admin" || 
                  email === "apexworkwearportal@gmail.com" || 
                  email.endsWith("@apexworkwear.ca");

  if (!isAdmin && adminDb) {
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data().role === "admin") {
      return decodedToken;
    }
    throw new Error("Access forbidden. Admin role required.");
  }

  if (!isAdmin) {
    throw new Error("Access forbidden. Admin role required.");
  }

  return decodedToken;
}

// GET: List all users from Auth & Firestore
export async function GET(req) {
  try {
    await verifyAdminToken(req);

    const userMap = new Map();

    // 1. Fetch from Firestore users collection
    if (adminDb) {
      const snap = await adminDb.collection("users").get();
      snap.forEach(doc => {
        userMap.set(doc.id, { uid: doc.id, ...doc.data() });
      });
    }

    // 2. Fetch from Firebase Auth
    if (adminAuth) {
      const authUsers = await adminAuth.listUsers(1000);
      authUsers.users.forEach(u => {
        const existing = userMap.get(u.uid) || {};
        userMap.set(u.uid, {
          uid: u.uid,
          email: u.email,
          name: u.displayName || existing.name || u.email?.split("@")[0],
          role: existing.role || (u.customClaims?.admin || u.customClaims?.role === "admin" ? "admin" : "customer"),
          disabled: u.disabled,
          createdAt: u.metadata?.creationTime || existing.createdAt,
          lastSignIn: u.metadata?.lastSignInTime,
          ...existing
        });
      });
    }

    const usersList = Array.from(userMap.values());
    return Response.json({ users: usersList });
  } catch (error) {
    console.error("GET /api/admin/users error:", error.message);
    return Response.json({ error: error.message }, { status: 403 });
  }
}

// POST: Create a new User / Admin
export async function POST(req) {
  try {
    await verifyAdminToken(req);
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const userRole = role === "admin" ? "admin" : "customer";

    // Create user in Auth
    const newAuthUser = await adminAuth.createUser({
      email,
      password,
      displayName: name || email.split("@")[0]
    });

    // Set custom claims if admin
    if (userRole === "admin") {
      await adminAuth.setCustomUserClaims(newAuthUser.uid, { admin: true, role: "admin" });
    }

    // Create user document in Firestore
    if (adminDb) {
      await adminDb.collection("users").doc(newAuthUser.uid).set({
        uid: newAuthUser.uid,
        email,
        name: name || email.split("@")[0],
        role: userRole,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
    }

    return Response.json({ 
      success: true, 
      user: {
        uid: newAuthUser.uid,
        email,
        name: name || email.split("@")[0],
        role: userRole
      }
    });
  } catch (error) {
    console.error("POST /api/admin/users error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Change user role or password
export async function PATCH(req) {
  try {
    await verifyAdminToken(req);
    const { uid, newRole, newPassword } = await req.json();

    if (!uid) {
      return Response.json({ error: "User ID (uid) is required." }, { status: 400 });
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return Response.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
      }
      await adminAuth.updateUser(uid, { password: newPassword });
    }

    // Update role if provided
    if (newRole) {
      const formattedRole = newRole === "admin" ? "admin" : "customer";
      await adminAuth.setCustomUserClaims(uid, {
        admin: formattedRole === "admin",
        role: formattedRole
      });

      if (adminDb) {
        await adminDb.collection("users").doc(uid).set({
          role: formattedRole,
          updatedAt: new Date()
        }, { merge: true });
      }
    }

    return Response.json({ success: true, message: "User credentials/role updated successfully." });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
