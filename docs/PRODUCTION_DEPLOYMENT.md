# 🚀 Production Deployment Guide — jsonblob-app

> This document covers everything needed to deploy jsonblob-app to production on Cloudflare Pages with a working public Cloudflare OAuth integration.

---

## 1. Cloudflare OAuth App Setup

### Make the OAuth App Public

> ⚠️ **This step is irreversible.** Once set to Public, the app cannot go back to Private.

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) with `gavvavamsikrishna@gmail.com`
2. Go to **Manage Account → OAuth Clients**
3. Click **"developer work space"**
4. Fill in the required fields before clicking "Change Visibility":

| Field | Value |
|---|---|
| **Client URL** | `https://jsonblob.pages.dev` |
| **Privacy Policy URL** | `https://jsonblob.pages.dev/privacy` |
| **Terms of Service URL** | `https://jsonblob.pages.dev/terms` |

5. Add **all three redirect URIs**:
   ```
   http://localhost:3000/api/auth/cloudflare/callback
   https://uat.jsonblob-app.pages.dev/api/auth/cloudflare/callback
   https://jsonblob.pages.dev/api/auth/cloudflare/callback
   ```
6. Click **Change Visibility → OK** to make it Public

---

## 2. Environment Variables

### What Goes Where

| Variable | Type | Environments |
|---|---|---|
| `CLOUDFLARE_CLIENT_ID` | Plain var (in `wrangler.json`) | UAT + Production |
| `CLOUDFLARE_CLIENT_SECRET` | **Secret** (never in code/files) | UAT + Production |
| `CLOUDFLARE_REDIRECT_URI` | Plain var (in `wrangler.json`) | UAT + Production |
| `NEXT_PUBLIC_APP_URL` | Plain var (in `wrangler.json`) | UAT + Production |

### Setting Secrets via Wrangler CLI

Run these commands once per environment. You will be prompted to enter the value.

**UAT (preview):**
```bash
echo "YOUR_CLIENT_SECRET" | npx wrangler pages secret put CLOUDFLARE_CLIENT_SECRET \
  --project-name jsonblob-app \
  --env preview
```

**Production:**
```bash
echo "YOUR_CLIENT_SECRET" | npx wrangler pages secret put CLOUDFLARE_CLIENT_SECRET \
  --project-name jsonblob-app
```

> **Current Client Secret:** `cfoc_oCGnle064bwCNvkS8anivkY4ckctuF8m0x5gE9g9ff59553c`  
> ⚠️ Rotate this secret if it is ever exposed in git history.

### Setting Secrets via Cloudflare Dashboard (Alternative)

1. Go to **Workers & Pages → jsonblob-app → Settings → Environment Variables**
2. Under **Preview** environment, click **Add variable**:
   - Key: `CLOUDFLARE_CLIENT_SECRET` | Value: (secret) | ✅ Encrypt
3. Repeat under **Production** environment

---

## 3. Update `wrangler.json` for Production

Before deploying to production, update the `vars` section in `wrangler.json`:

```json
{
  "vars": {
    "CLOUDFLARE_CLIENT_ID": "1cc954f25945e1e46bf4a5ac1d268cc3",
    "CLOUDFLARE_REDIRECT_URI": "https://jsonblob.pages.dev/api/auth/cloudflare/callback",
    "NEXT_PUBLIC_APP_URL": "https://jsonblob.pages.dev/"
  }
}
```

> **UAT `wrangler.json` uses:**
> ```json
> "CLOUDFLARE_REDIRECT_URI": "https://uat.jsonblob-app.pages.dev/api/auth/cloudflare/callback"
> "NEXT_PUBLIC_APP_URL": "https://uat.jsonblob-app.pages.dev/"
> ```

---

## 4. D1 Database for Production

Create a separate D1 database for production (don't share with dev/UAT):

```bash
npx wrangler d1 create jsonblob-db-prod
```

Update `wrangler.json` with the production database ID:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "jsonblob-db-prod",
      "database_id": "REPLACE_WITH_PROD_DB_ID"
    }
  ]
}
```

Run migrations on production:
```bash
npx wrangler d1 migrations apply jsonblob-db-prod --remote
```

---

## 5. Deploy to Production

```bash
# Build the app
npm run build

# Deploy to Cloudflare Pages production
npx wrangler pages deploy .vercel/output/static --project-name jsonblob-app
```

Or push to your **main** branch — Cloudflare Pages auto-deploys from GitHub.

---

## 6. Post-Deployment Checklist

- [ ] OAuth App is set to **Public** with all 3 redirect URIs registered
- [ ] `CLOUDFLARE_CLIENT_SECRET` secret is set in **Production** environment
- [ ] `CLOUDFLARE_CLIENT_SECRET` secret is set in **Preview** (UAT) environment
- [ ] Production `wrangler.json` vars updated to production domain
- [ ] Production D1 database created and migrations applied
- [ ] Test OAuth flow with `gavvavamsikrishna@gmail.com`
- [ ] Test OAuth flow with `vamsi@marensilutions.com`
- [ ] Verify D1 databases load after login
- [ ] Check `/auth` error page shows proper message on OAuth failure

---

## 7. Verifying Secrets Are Set

```bash
# List all secrets for the project
npx wrangler pages secret list --project-name jsonblob-app
```

---

## 8. Rotating the Client Secret

If the secret is ever exposed:
1. Go to Cloudflare Dashboard → OAuth Clients → **developer work space**
2. Click **Rotate Secret** to generate a new one
3. Re-run the wrangler secret put command with the new value for both environments
4. Redeploy

---

## Current Credentials Reference

| Key | Value |
|---|---|
| Client ID | `1cc954f25945e1e46bf4a5ac1d268cc3` |
| UAT URL | `https://uat.jsonblob-app.pages.dev` |
| Production URL | `https://jsonblob.pages.dev` *(update when live)* |
| OAuth App Name | `developer work space` |
| Cloudflare Account | `gavvavamsikrishna@gmail.com` |
