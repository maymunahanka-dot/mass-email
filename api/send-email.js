/**
 * api/send-email.js  — Vercel serverless function
 *
 * POST /api/send-email
 * Body:
 *   { subject, message, recipients: 'all' | string[] }
 *
 * - Fetches users from Firestore fashiontally_users
 * - Sends via Mailtrap live SMTP (same as Fashiontally_Backend)
 */

import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// ── Firebase Admin (lazy init so it doesn't re-init on hot reload) ───────────
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

// ── Mailtrap transporter (same config as be/config/mailtrap.js) ──────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: 'live.smtp.mailtrap.io',
    port: 587,
    auth: {
      user: 'api',
      pass: process.env.MAILTRAP_TOKEN,
    },
  });
}

// ── Email HTML template ──────────────────────────────────────────────────────
function buildHtml(subject, message) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;
                background: #ffffff; border-radius: 12px; overflow: hidden;
                border: 1px solid #e5e7eb;">
      <div style="background: #16988d; padding: 28px 40px; text-align: center;">
        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">FashionTally</h1>
      </div>
      <div style="padding: 36px 40px;">
        <h2 style="color:#111827; font-size:18px; margin:0 0 16px 0;">${subject}</h2>
        <p style="color:#374151; font-size:15px; line-height:1.7; margin:0 0 24px 0;">
          ${escaped}
        </p>
      </div>
      <div style="background:#f9fafb; padding:18px 40px; text-align:center;
                  border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af; font-size:11px; margin:0;">
          © ${new Date().getFullYear()} FashionTally. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { subject, message, recipients } = req.body || {};

  if (!subject || !String(subject).trim()) {
    return res.status(400).json({ success: false, error: 'Subject is required' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  if (!recipients) {
    return res.status(400).json({ success: false, error: 'Recipients are required' });
  }

  try {
    const db = getFirebase();

    // ── Fetch users from Firestore ───────────────────────────────────────────
    const snap = await db.collection('fashiontally_users').get();
    let allUsers = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.email) {
        allUsers.push({
          email: (d.email || '').toLowerCase().trim(),
          name:  d.name || d.displayName || d.fullName || '',
        });
      }
    });

    // ── Filter to requested recipients ──────────────────────────────────────
    let targets = [];
    if (recipients === 'all') {
      targets = allUsers;
    } else if (Array.isArray(recipients)) {
      const set = new Set(recipients.map(e => e.toLowerCase().trim()));
      targets = allUsers.filter(u => set.has(u.email));
    } else {
      return res.status(400).json({ success: false, error: 'recipients must be "all" or an array of emails' });
    }

    if (targets.length === 0) {
      return res.status(400).json({ success: false, error: 'No matching users found' });
    }

    // ── Send emails ──────────────────────────────────────────────────────────
    const transporter = getTransporter();
    const html = buildHtml(subject, message);

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const user of targets) {
      try {
        await transporter.sendMail({
          from:    '"FashionTally" <no-reply@fashiontally.com>',
          to:      user.email,
          subject: subject.trim(),
          html,
        });
        sent++;
      } catch (err) {
        failed++;
        errors.push({ email: user.email, error: err.message });
        console.error(`[send-email] Failed to send to ${user.email}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: targets.length,
      errors: errors.length ? errors : undefined,
    });

  } catch (err) {
    console.error('[send-email] Fatal error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
