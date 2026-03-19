# Zenith ITR — Phased Deployment Plan

Build and deploy in order. Each phase is **deployable on its own** so you can ship after any phase.

---

## Phase 1: Foundation & Security

**Goal:** Secure auth, clean codebase, theme toggle. App is safe to use with real redirects from ZenithBooks.

| # | Task | Details |
|---|------|--------|
| 1.1 | **Server-side JWT verification** | Add Firebase Function `verifyToken`: accepts `?token=...`, verifies signature with `ITR_JWT_SECRET`, returns `{ userId, name, email, pan }` or error. Store `ITR_JWT_SECRET` in Firebase config or Secret Manager. |
| 1.2 | **TokenGate calls verifyToken** | On load with `?token=`, call Firebase `verifyToken` (HTTP) instead of client-side decode. On success set session and redirect to `/dashboard` (clean URL). On error show "Session expired" card with link to zenithbooks.in. |
| 1.3 | **Remove Index placeholder** | Delete or repurpose `src/pages/Index.tsx` (e.g. re-export TokenGate). Ensure no broken imports; routes already use TokenGate at `/`. |
| 1.4 | **Theme toggle (dark/light)** | Wrap app in `ThemeProvider` (next-themes) in `main.tsx` or `App.tsx`. Add header toggle in `AppLayout` to switch theme. Default dark. |
| 1.5 | **Env & docs** | Document `ITR_JWT_SECRET` (Firebase only), `VITE_FIREBASE_QUICKO_FUNCTION_URL`, and Firebase config in README / `.env.example`. |

**Deliverables:** Secure token flow, theme switch, no placeholder page, env documented.

---

## Phase 2: Quicko Integration — Upload & Parse

**Goal:** Real Form 16 and AIS parsing; draft auto-filled from Quicko.

| # | Task | Details |
|---|------|--------|
| 2.1 | **Upload Form 16 → Quicko** | In `UploadPage`, on Form 16 file select: convert file to base64 (`fileToBase64`), call `callQuickoApi('parse_form16', { file, filename })`. Map response to draft (grossSalary, TDS, employer, etc.) and update `DraftContext`. Remove setTimeout mock. |
| 2.2 | **Upload AIS → Quicko** | On AIS file select: base64 + `callQuickoApi('parse_ais', { file, filename })`. Merge response into draft (interest, dividends, etc.). Set `autoFilled` and show success toast. |
| 2.3 | **Error handling & loading** | On API failure show error toast; keep "Processing..." state during request. Optional: use `ShimmerCard` or skeleton while waiting. |
| 2.4 | **Confidence score in toast** | If Quicko response includes confidence/metric, show in toast (e.g. "Auto-filled ~90% with 95% confidence"); else keep friendly static message. |
| 2.5 | **Save Draft feedback** | Optional: toast "Draft saved to this device" on Save Draft click (draft already persists in localStorage). |

**Deliverables:** Real OCR/parse from Form 16 and AIS; draft populated; clear errors and toasts.

---

## Phase 3: Quicko Integration — Filing & Success

**Goal:** Real ITR prepare/validate/submit; real ARN and next steps.

| # | Task | Details |
|---|------|--------|
| 3.1 | **Preview → File flow** | On "File ITR-1 Now": call `callQuickoApi('prepare_itr', draftPayload)` then `validate_itr` then `submit_itr` (or equivalent per Quicko docs). Handle errors (e.g. validation errors) with toast or inline message. |
| 3.2 | **Success page — real ARN** | Pass ARN (and status) from submit response to Success page (e.g. route state or context). Display real ARN; copy button uses it. Remove mock ARN generation. |
| 3.3 | **ITR JSON download (fallback)** | If Quicko does not support direct ERI submission: after prepare/validate, get ITR JSON and trigger download. Show instructions: "Upload this JSON on incometax.gov.in and e-verify." Open incometax.gov.in in new tab. |
| 3.4 | **E-verify & ITR-V** | Success page: "E-Verify on Portal" link to incometax.gov.in. If Quicko returns ITR-V URL, "Download ITR-V" uses it; else link to portal with short instruction. |
| 3.5 | **Filing state** | During prepare/validate/submit show "Filing your ITR-1..." with spinner; on success show confetti and success card. |

**Deliverables:** End-to-end filing with real ARN; ITR-V/e-verify guidance; fallback JSON download when needed.

---

## Phase 4: Persistence & Real Data (Firestore)

**Goal:** Filings and optional drafts in Firestore; dashboard shows real history.

| # | Task | Details |
|---|------|--------|
| 4.1 | **Firestore collections** | Define `filings` (e.g. userId, arn, status, assessmentYear, createdAt, itrVUrl?, applicationId?). Optional: `drafts` (userId, draft JSON, updatedAt). |
| 4.2 | **Save filing after submit** | After successful submit in Phase 3, write to Firestore `filings` (userId from session, ARN, status, etc.). Use Firebase SDK in frontend with security rules, or call a Firebase Function that writes from backend. |
| 4.3 | **Dashboard — load filings** | Dashboard fetches filings for current user from Firestore (or via HTTP function). Replace `mockFilings` with real list. Show ARN, status badge, date, assessment year. |
| 4.4 | **Dashboard — ITR-V link** | "Download ITR-V" per filing: use stored `itrVUrl` or link to portal with ARN. |
| 4.5 | **Optional: server-side draft** | "Save Draft" could write draft to Firestore so user can resume on another device. Load draft from Firestore when user has no local draft. |

**Deliverables:** Real filings list on dashboard; ITR-V links; optional cloud draft.

---

## Phase 5: UX Polish & Content

**Goal:** Mismatch alerts, FAQ, shimmer, and small UX improvements.

| # | Task | Details |
|---|------|--------|
| 5.1 | **Mismatch alerts (Review)** | Define rules (e.g. TDS vs computed tax, AIS vs entered values). Compute mismatch flags per section/field. Show subtle gold/red badge or icon with tooltip ("TDS differs from computed tax because..."). |
| 5.2 | **FAQ drawer** | Add collapsible FAQ section (drawer or accordion): e.g. "What is ITR-1?", "How do I e-verify?", "Where is my refund?". Accessible from footer or "Need Help?" area. |
| 5.3 | **Shimmer loading** | Use existing `ShimmerCard` (or similar) for Dashboard cards, Review sections, or Preview while data is loading. Replace or complement spinners where it fits. |
| 5.4 | **Need Help? FAB** | Wire "Need Help?" floating button: open FAQ drawer, or link to support/contact page, or mailto. |
| 5.5 | **Track Refund Status** | On Success page add card/link: "Track Refund Status" → incometax.gov.in or status portal with short instruction. |

**Deliverables:** Review page has mismatch tooltips; FAQ available; loading states use shimmer; Help FAB and refund link in place.

---

## Phase 6: Production Hardening (Optional)

**Goal:** Robustness and ops readiness.

| # | Task | Details |
|---|------|--------|
| 6.1 | **Error boundaries** | Add React error boundary so uncaught errors show a friendly message instead of blank screen. |
| 6.2 | **Retry / offline** | Optional: retry failed Quicko calls once; show "Check connection" if offline. |
| 6.3 | **Function env checklist** | README or script: list all required env vars for Firebase (ITR_JWT_SECRET, Quicko keys, etc.) and how to set them. |
| 6.4 | **Rate limiting / abuse** | Optional: rate-limit verifyToken and quickoApi (e.g. per IP or per token) in Firebase Functions. |

**Deliverables:** Graceful errors; env checklist; optional retry and rate limits.

---

## Summary Table

| Phase | Focus | Deploy after |
|-------|--------|----------------|
| **1** | Foundation & Security (JWT verify, theme, cleanup) | Yes |
| **2** | Quicko Upload & Parse (Form 16, AIS → draft) | Yes |
| **3** | Quicko Filing & Success (prepare/validate/submit, ARN) | Yes |
| **4** | Firestore (filings, dashboard real data) | Yes |
| **5** | UX Polish (mismatch, FAQ, shimmer, help, refund link) | Yes |
| **6** | Production Hardening (errors, retry, env, rate limit) | Optional |

---

## How to Use This Plan

- Say **"Build Phase 1"** (or "Implement Phase 2", etc.) and we will implement only that phase’s tasks.
- After each phase you can deploy and test before moving to the next.
- Phases 1–3 are required for a minimal production flow (secure auth + real upload + real filing). Phases 4–6 add persistence, polish, and hardening.
