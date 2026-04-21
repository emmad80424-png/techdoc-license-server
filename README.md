# TechDoc License Server

License validation server for the Technical Documentation Generator VS Code extension. Handles Gumroad purchase webhooks and validates license keys. Runs on Sonnet 4.6.

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check — Railway uses this |
| POST | `/webhook/gumroad` | Receives purchase notifications from Gumroad |
| POST | `/validate` | Validates a license key (called by VS Code extension) |
| POST | `/admin/issue-key` | Manually issue a license key |
| GET | `/admin/keys` | List all active keys |

---

## Deploy to Railway

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/techdoc-license-server.git
git push -u origin main
```

### Step 2 — Create Railway project
1. Go to railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `techdoc-license-server` repo
4. Railway detects Node.js automatically and deploys

### Step 3 — Set environment variables
In Railway dashboard → your project → **Variables** tab, add:

```
GUMROAD_SELLER_ID      your seller ID from gumroad.com/settings
GUMROAD_PRODUCT_ID     your product ID from the product URL
ADMIN_SECRET           a long random string (keep this secret)
```

Railway sets `PORT` automatically — do not set it manually.

### Step 4 — Get your Railway URL
Railway assigns a URL like:
```
https://techdoc-license-server-production.up.railway.app
```
Copy this — you'll need it for the next steps.

### Step 5 — Update the VS Code extension
In `src/license.ts`, update:
```typescript
const LICENSE_SERVER_URL = 'https://your-app.up.railway.app/validate';
```
Then recompile:
```bash
npm run compile
npm run package
```

### Step 6 — Set Gumroad Ping URL
1. Go to your Gumroad product → Edit
2. Scroll to **Advanced** → **Ping URL**
3. Set to: `https://your-app.up.railway.app/webhook/gumroad`
4. Save

---

## Test the Deployment

### Issue a test key
```bash
curl -X POST https://your-app.up.railway.app/admin/issue-key \
  -H "x-admin-secret: your_admin_secret"
```
Returns: `{ "key": "TDOC-XXXX-XXXX-XXXX" }`

### Validate the key
```bash
curl -X POST https://your-app.up.railway.app/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"TDOC-XXXX-XXXX-XXXX"}'
```
Returns: `{ "valid": true, "message": "License valid." }`

### Test the Gumroad webhook manually
```bash
curl -X POST https://your-app.up.railway.app/webhook/gumroad \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "your_seller_id",
    "product_id": "your_product_id",
    "email": "test@example.com"
  }'
```

---

## Important Notes

**Memory resets on restart**
License keys are stored in memory. If the server restarts, keys are lost. For production, upgrade to Railway's Postgres addon:
- Railway dashboard → New → Database → PostgreSQL
- Replace the `Set()` with database queries

**Finding your Gumroad IDs**
- Seller ID: gumroad.com/settings → scroll to bottom → User ID
- Product ID: the short code in your product URL e.g. `gumroad.com/l/PRODUCT_ID`

**Generating a strong ADMIN_SECRET**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
