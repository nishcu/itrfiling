# Zenith ITR — Premium ITR-1 Sahaj Filing

A premium web app for ITR-1 Sahaj filing in India. Users arrive via secure redirect from zenithbooks.in after payment.

## Tech stack

- **Frontend:** React, Vite, TypeScript, Tailwind, shadcn/ui, Framer Motion
- **Backend:** Firebase (Cloud Functions, optional Firestore/Auth later)
- **Integrations:** Quicko production API (via Firebase Function proxy)

## Firebase setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com).

2. **Register a web app** and copy the config into `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. **Create secrets in Google Cloud Secret Manager** (required before first deploy):
   - Open [Google Cloud Console](https://console.cloud.google.com) → your project → **Security** → **Secret Manager**.
   - Enable the Secret Manager API if prompted.
   - Click **Create secret** and add these three secrets (names must match exactly):
     - **ITR_JWT_SECRET** — value: the same secret ZenithBooks uses to sign the redirect JWT.
     - **QUICKO_ACCESS_KEY** — value: your Quicko API key (name avoids conflict with old Cloud Run env `QUICKO_API_KEY`).
     - **QUICKO_ACCESS_SECRET** — value: your Quicko API secret.
   - After deploy, grant the Cloud Functions runtime access: Secret Manager → each secret → **Permissions** → Add principal `PROJECT_NUMBER-compute@developer.gserviceaccount.com` with role **Secret Manager Secret Accessor** (or use the automatic grant when Firebase prompts on first deploy).

4. **Deploy Cloud Functions** (includes `verifyToken` and `quickoApi`):
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```
   The functions use **Secret Manager** for credentials. After deploy, copy the **exact** function URLs from the CLI output or Firebase Console → Functions.

   **Important — avoid `ERR_CERT_COMMON_NAME_INVALID`:** Cloud Run URLs look like `https://quickoapi-HASH-us-central1.a.run.app` (note **`.a.`** before `run.app`). A hostname like `https://quickoapi-xxx.run.app` (missing region / `.a.`) is **wrong** and will show a certificate error in the browser. **Recommended:** use the **`cloudfunctions.net`** URLs instead — they always match the cert:
   - `https://<region>-<projectId>.cloudfunctions.net/verifyToken`
   - `https://<region>-<projectId>.cloudfunctions.net/quickoApi`

5. **Set the function URLs in the app** `.env` (rebuild + redeploy Hosting after any change):
   ```
   VITE_FIREBASE_VERIFY_TOKEN_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/verifyToken
   VITE_FIREBASE_QUICKO_FUNCTION_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/quickoApi
   ```

6. **Phase 4 – Firestore (filings & drafts):** Deploy rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```
   Collections: `filings` (per-user filing records with ARN, status, itrVUrl), `drafts` (one doc per user for cloud draft). Edit `firestore.rules` for production (e.g. restrict by `request.auth.uid` when using Firebase Auth).

## Run locally

```bash
npm install --legacy-peer-deps
npm run dev
```

For local function development:
```bash
cd functions && npm install && npm run build
firebase emulators:start --only functions
```
Then set `VITE_FIREBASE_QUICKO_FUNCTION_URL=http://127.0.0.1:5001/YOUR_PROJECT/us-central1/quickoApi` (or use the URL the emulator prints).

## Project structure

- `src/` — React app (TokenGate, Dashboard, Upload, Review, Preview, Success)
- `src/integrations/firebase/` — Firebase app config
- `src/lib/api.ts` — Quicko API and filing flow helpers
- `src/lib/firestore.ts` — Firestore helpers (`filings`, `drafts`)
- `functions/` — Firebase Cloud Functions (`verifyToken`, `quickoApi`)
- `firestore.rules`, `firestore.indexes.json` — Firestore security and indexes

## Env reference

| Variable | Where | Purpose |
|----------|--------|--------|
| `VITE_FIREBASE_*` | Frontend `.env` | Firebase web app config |
| `VITE_FIREBASE_VERIFY_TOKEN_URL` | Frontend `.env` | verifyToken function URL (Phase 1; optional for dev) |
| `VITE_FIREBASE_QUICKO_FUNCTION_URL` | Frontend `.env` | quickoApi function URL |
| `ITR_JWT_SECRET` or `itr.jwt_secret` | Firebase Functions only | Secret for ZenithBooks JWT verification (never in frontend) |
| `QUICKO_ACCESS_KEY`, `QUICKO_ACCESS_SECRET` (Secret Manager) | Cloud Functions | Quicko credentials for `quickoApi` |

Supabase has been removed; the backend is Firebase (Cloud Functions). Optional: use Firestore for filings/drafts and Firebase Auth if you add login later.

---

## Environment checklist (Phase 6)

Use this checklist before going to production.

### Frontend (`.env` in project root)

| Variable | Required | How to set |
|----------|----------|------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Console → Project settings → Your apps → Web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Same as above |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Same as above |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Same as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Same as above |
| `VITE_FIREBASE_APP_ID` | Yes | Same as above |
| `VITE_FIREBASE_VERIFY_TOKEN_URL` | Yes (prod) | After deploying functions: `https://<region>-<project>.cloudfunctions.net/verifyToken` |
| `VITE_FIREBASE_QUICKO_FUNCTION_URL` | Yes (prod) | After deploying: `https://<region>-<project>.cloudfunctions.net/quickoApi` |

Copy from `.env.example` and replace placeholder values. Never commit real secrets; use env in CI (e.g. Vite env vars).

### Firebase Functions (server-only; never in frontend)

| Variable | Required | How to set |
|----------|----------|------------|
| `ITR_JWT_SECRET` | Yes | Same secret ZenithBooks uses to sign the redirect JWT. Set via: `firebase functions:config:set itr.jwt_secret="YOUR_SECRET"` or in Firebase Console → Project settings → Functions → Environment variables. |
| `QUICKO_ACCESS_KEY` | Yes (for filing) | Secret Manager: Quicko API key. |
| `QUICKO_ACCESS_SECRET` | Yes (for filing) | Secret Manager: Quicko API secret. |
| `QUICKO_BASE_URL` | No | Defaults to `https://api.quicko.com`. Override only for staging/sandbox. |

**Quick set (CLI):**
```bash
firebase functions:config:set itr.jwt_secret="YOUR_ITR_JWT_SECRET"
firebase functions:config:set quicko.api_key="YOUR_QUICKO_KEY" quicko.api_secret="YOUR_QUICKO_SECRET"
```

Then redeploy: `firebase deploy --only functions`.

**Check from project root:** `npm run check-env` — validates that required frontend variables are set in `.env` (see `scripts/check-env.mjs`).

## Phased deployment

See **[DEPLOYMENT_PHASES.md](./DEPLOYMENT_PHASES.md)** for the full plan. Build in order: Phase 1 (security & theme) → Phase 2 (Quicko upload/parse) → Phase 3 (filing & ARN) → Phase 4 (Firestore) → Phase 5 (UX polish) → Phase 6 (hardening).
