# Zenith ITR — What’s Done vs Pending

**→ For a phased build and deployment plan, see [DEPLOYMENT_PHASES.md](./DEPLOYMENT_PHASES.md).** You can ask to "Build Phase N" and implement in order.

Based on the original spec (Lovable build), here’s what is implemented and what is still pending.

---

## ✅ Implemented (structure & UI)

### Auth & entry
- **TokenGate (`/`)** — Reads `?token=`, client-side JWT decode (no signature verification), extracts userId/name/email/PAN, creates session, redirects to `/dashboard` with clean URL. Demo mode when no token (auto session).
- **Session** — Stored in `sessionStorage`; `SessionContext` + persistence.
- **Route protection** — `AppLayout` redirects unauthenticated users to `/` for all routes except `/`.

### Pages & flow
- **Dashboard** — Welcome hero, “Start Filing” CTA, mock previous filings list (ARN, status, download placeholder).
- **Upload (`/upload`)** — Two drag-drop zones (Form 16 PDF, AIS PDF/JSON), progress/processing state, “Save Draft” + “Continue to Review”. **Uses mock/setTimeout only — no real OCR/Quicko.**
- **Review (`/review`)** — Collapsible sections (Salary, Other sources, Deductions, House property), inline editable fields, Old/New regime toggle, `TaxComparison` component.
- **Preview (`/preview`)** — Big refund/payable number, summary cards, regime comparison, “File ITR-1 Now” → `/file`.
- **Success (`/file`)** — Filing-in-progress state, then success card, mock ARN, copy ARN, e-verify steps, “Download ITR-V” / “E-Verify on Portal” links, confetti. **No real Quicko submit or ARN.**

### UI & design
- **Theme** — Dark mode default (`class="dark"` on `<html>`), CSS variables for light/dark. **No theme toggle (e.g. next-themes) wired in app root.**
- **Typography** — Inter + Satoshi in Tailwind and `index.html` (Google Fonts + Fontshare).
- **Styling** — Glassmorphism (`.glass`, `.glass-strong`), gradients, gold/accent, progress bar with step indicators and %, animations (framer-motion), “Need Help?” FAB.
- **Progress bar** — Top progress with steps (Upload → Review → Preview → File) and percentage.
- **Draft** — `DraftContext` + `localStorage` for draft; “Save Draft” buttons present (actual save is to same context/storage).

### Backend (Supabase Edge Function)
- **`supabase/functions/quicko-api/index.ts`** — Quicko auth (token), actions: `parse_form16`, `parse_ais`, `calculate_tax`, `prepare_itr`, `validate_itr`, `submit_itr`. **Not called from frontend anywhere.**

---

## ❌ Pending / To-do

### 1. JWT verification (security)
- **Requirement:** Verify JWT **server-side** with `ITR_JWT_SECRET`.
- **Current:** TokenGate only decodes payload client-side (no signature verification).
- **Todo:** Add a Supabase Edge Function (e.g. `verify-token`) that checks signature and expiry, returns user claims; TokenGate calls it with `?token=...` and sets session from response. Add `ITR_JWT_SECRET` to Supabase secrets.

### 2. Quicko integration (upload & filing)
- **Upload:** Replace setTimeout mocks with real calls:
  - Upload Form 16 file to backend → backend calls Quicko `parse_form16` (or equivalent) → return extracted data → fill draft (salary, TDS, employer, etc.).
  - Upload AIS file/JSON → backend calls Quicko `parse_ais` → return data → merge into draft (interest, dividends, etc.).
- **Success / File:** On “File ITR-1 Now”:
  - Call backend to **prepare** ITR (draft → Quicko `prepare_itr`), then **validate**, then **submit** (or get JSON for portal).
  - Use real ARN from Quicko (or portal) and persist it (DB or session).
  - If Quicko doesn’t support direct ERI submission: auto-download ITR JSON + open incometax.gov.in with instructions.
- **Env:** Ensure `QUICKO_API_KEY`, `QUICKO_API_SECRET`, `QUICKO_BASE_URL` are set in Supabase (and optionally in `.env` for local dev). Frontend must call Supabase Edge Function (or your API) that uses these.

### 3. Draft “Save Draft” behavior
- Draft is already saved to `localStorage` on every field update. “Save Draft” can be clarified (e.g. “Saved to browser”) or extended to **server-side draft** (Supabase table keyed by `userId`/session) so drafts survive devices.

### 4. Dashboard — real filings
- **Current:** Static `mockFilings` array.
- **Todo:** Load previous filings from DB (e.g. Supabase table: `application_id`, ARN, status, date, user_id). “Download ITR-V” should use real link (Quicko or portal) when available.

### 5. Success page — real ARN & ITR-V
- **Current:** Random mock ARN, placeholder ITR-V / e-verify links.
- **Todo:** After real submit: show actual ARN, link to download ITR-V (from Quicko or portal), and “Track Refund Status” (link to portal or status API if you have one). Persist filing record (ARN, status, JSON) in DB.

### 6. Dark / light mode toggle
- **Requirement:** “Dark/light mode (default dark)”.
- **Current:** Default dark is set via `class="dark"`; no UI toggle.
- **Todo:** Wrap app in `ThemeProvider` (next-themes) and add a header toggle so users can switch theme.

### 7. Confidence score & toasts
- **Requirement:** After auto-fill: “Auto-filled ~90% of your return!” with **confidence score**.
- **Current:** Upload toasts say “~90%” and “95% confidence” as fixed text.
- **Todo:** If Quicko (or your parser) returns a confidence/metric, show it in the toast; otherwise keep as UX message.

### 8. Mismatch alerts & tooltips (Review)
- **Requirement:** “Highlight mismatches/alerts in subtle gold/red with tooltips explaining why”.
- **Current:** No mismatch detection or tooltips.
- **Todo:** Define rules (e.g. TDS vs computed tax, AIS vs Form 16), compute mismatch flags, show badges/tooltips on Review fields.

### 9. Collapsible FAQ drawer
- **Requirement:** “Collapsible FAQ drawer”.
- **Current:** Not present.
- **Todo:** Add an FAQ section (e.g. in a drawer or accordion) with common ITR-1 / e-verify questions.

### 10. Shimmer loading skeletons
- **Requirement:** “Shimmer loading skeletons”.
- **Current:** `ShimmerCard` component exists but is unused; upload uses a spinner.
- **Todo:** Use `ShimmerCard` (or similar) for dashboard cards, review sections, or preview while data is loading.

### 11. Index page
- **Current:** `src/pages/Index.tsx` is a placeholder (Lovable default). App routing uses `TokenGate` at `/`.
- **Todo:** Remove or repurpose `Index.tsx` (e.g. re-export TokenGate or a simple landing that redirects to TokenGate) so the codebase is consistent.

### 12. Environment variables
- **Current:** `.env` has only Supabase vars (`VITE_SUPABASE_*`). No `ITR_JWT_SECRET` on frontend (correct — use server-only).
- **Todo:** Document and set in Supabase (or server): `ITR_JWT_SECRET`, `QUICKO_API_KEY`, `QUICKO_API_SECRET`, `QUICKO_BASE_URL`.

### 13. FileUploadZone — progress bar
- **Requirement:** “Progress bars” on upload zones.
- **Current:** Indeterminate “Processing with AI…” spinner only.
- **Todo:** If backend supports upload progress (e.g. chunked or streaming), pass progress % and show a determinate progress bar in `FileUploadZone`.

---

## Summary table

| Area              | Status   | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| Auth flow (UI)    | Done     | Server-side JWT verify pending                     |
| Session           | Done     | sessionStorage                                     |
| Route protection  | Done     |                                                    |
| Dashboard         | Partial  | Real filings + ITR-V links pending                  |
| Upload            | Mock     | Wire to Quicko Form 16 + AIS parsing               |
| Review            | Done     | Mismatch tooltips pending                           |
| Preview           | Done     |                                                    |
| File / Success    | Mock     | Real Quicko prepare/validate/submit + ARN + DB     |
| Quicko API (CF)   | Done     | Not called from frontend yet                        |
| Dark/light toggle | Missing  | Theme provider + toggle                             |
| FAQ drawer        | Missing  |                                                    |
| Shimmer skeletons | Partial  | Component exists, not used                           |
| Progress % upload | Partial  | Spinner only                                        |

---

## Suggested order of implementation

1. **Server-side JWT verification** (security first).
2. **Frontend → Quicko flow:** Upload (Form 16 + AIS) via Edge Function, then fill draft from API response.
3. **Filing flow:** Prepare → Validate → Submit (or download JSON) and show real ARN; persist in DB.
4. **Dashboard:** Load and show real filings; real ITR-V download links.
5. **Theme toggle, FAQ drawer, mismatch tooltips, shimmer loading** (UX polish).
6. **Cleanup:** Remove or use `Index.tsx`, document env vars.
