const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// LICENSE STORE
// In-memory for MVP. Upgrade to a real database
// (Postgres via Railway) when you're ready.
// ─────────────────────────────────────────────
const validLicenseKeys = new Set();

// ─────────────────────────────────────────────
// GENERATE A LICENSE KEY
// Format: TDOC-XXXX-XXXX-XXXX
// ─────────────────────────────────────────────
function generateKey() {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TDOC-${segment()}-${segment()}-${segment()}`;
}

// ─────────────────────────────────────────────
// GUMROAD WEBHOOK
// Fires when a customer completes a purchase.
// Set Ping URL in Gumroad dashboard to:
// https://your-app.up.railway.app/webhook/gumroad
// ─────────────────────────────────────────────
app.post('/webhook/gumroad', (req, res) => {
  const { seller_id, product_id, email } = req.body;

  const GUMROAD_SELLER_ID = process.env.GUMROAD_SELLER_ID;
  const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID;

  // Verify request is from your Gumroad product
  if (seller_id !== GUMROAD_SELLER_ID || product_id !== GUMROAD_PRODUCT_ID) {
    console.warn(`Unauthorized webhook attempt from seller: ${seller_id}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const key = generateKey();
  validLicenseKeys.add(key);
  console.log(`✅ License issued: ${key} for ${email}`);

  // TODO: Email key to buyer
  // Integrate Resend or SendGrid here:
  // await sendEmail(email, key);

  res.json({ success: true });
});

// ─────────────────────────────────────────────
// VALIDATE LICENSE KEY
// Called by the VS Code extension on startup.
// ─────────────────────────────────────────────
app.post('/validate', (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ valid: false, message: 'No key provided.' });
  }

  const isValid = validLicenseKeys.has(key.trim().toUpperCase());

  console.log(`🔑 Validation attempt: ${key.trim()} — ${isValid ? 'VALID' : 'INVALID'}`);

  res.json({
    valid: isValid,
    message: isValid
      ? 'License valid.'
      : 'Key not found. Purchase at gumroad.com/l/techdoc'
  });
});

// ─────────────────────────────────────────────
// ADMIN: MANUALLY ISSUE A KEY
// Use for testing, refunds, or replacements.
// Protected by x-admin-secret header.
// ─────────────────────────────────────────────
app.post('/admin/issue-key', (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const key = generateKey();
  validLicenseKeys.add(key);
  console.log(`🔧 Admin issued key: ${key}`);
  res.json({ key });
});

// ─────────────────────────────────────────────
// ADMIN: LIST ALL ACTIVE KEYS
// Useful for debugging. Remove in production
// if you don't want keys exposed.
// ─────────────────────────────────────────────
app.get('/admin/keys', (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ keys: Array.from(validLicenseKeys), count: validLicenseKeys.size });
});

// ─────────────────────────────────────────────
// HEALTH CHECK
// Railway uses this to verify the app is running.
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', keys: validLicenseKeys.size });
});

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ name: 'TechDoc License Server', version: '1.0.0', status: 'running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TechDoc License Server running on port ${PORT}`);
});
