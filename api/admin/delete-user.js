// API endpoint to delete admin user
// This would need to be implemented as a server-side API endpoint
// For now, this is a placeholder showing the structure needed

import { adminAuth, adminDb } from "../firebase-admin-config";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { adminEmail, uid } = req.body;

    if (!adminEmail || !uid) {
      return res
        .status(400)
        .json({ error: "Admin email and UID are required" });
    }

    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // Delete from Firestore
    await adminDb.collection("fashiontally_admins").doc(adminEmail).delete();

    return res
      .status(200)
      .json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return res.status(500).json({ error: "Failed to delete admin" });
  }
}
