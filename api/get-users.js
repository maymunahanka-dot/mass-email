/**
 * api/get-users.js  — Vercel serverless function
 *
 * GET /api/get-users
 * Returns list of { email, name } from fashiontally_users Firestore collection
 */

import admin from 'firebase-admin';

function getFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const db = getFirebase();
    const snap = await db.collection('fashiontally_users').get();

    const users = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.email) {
        users.push({
          email: (d.email || '').toLowerCase().trim(),
          name:  d.name || d.displayName || d.fullName || '',
        });
      }
    });

    // Sort by name then email
    users.sort((a, b) => {
      const na = (a.name || a.email).toLowerCase();
      const nb = (b.name || b.email).toLowerCase();
      return na.localeCompare(nb);
    });

    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('[get-users] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
