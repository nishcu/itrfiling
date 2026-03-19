import type { ITRDraft } from "@/context/DraftContext";

/**
 * Verify ZenithBooks JWT via Firebase Function.
 * Set VITE_FIREBASE_VERIFY_TOKEN_URL in .env, e.g.:
 * https://us-central1-YOUR_PROJECT.cloudfunctions.net/verifyToken
 */
const VERIFY_TOKEN_URL =
  import.meta.env.VITE_FIREBASE_VERIFY_TOKEN_URL || "";

export interface VerifiedSession {
  userId: string;
  name: string;
  email: string;
  pan: string;
}

/** Verify JWT server-side. Falls back to client decode if URL not set (dev/demo). */
export async function verifySessionToken(token: string): Promise<VerifiedSession> {
  if (VERIFY_TOKEN_URL) {
    assertValidFunctionUrl(VERIFY_TOKEN_URL, "VITE_FIREBASE_VERIFY_TOKEN_URL");
    const url = `${VERIFY_TOKEN_URL}?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json().catch(() => ({}))) as VerifiedSession & { error?: string };
    if (!res.ok) {
      throw new Error(data?.error || "Verification failed");
    }
    return { userId: data.userId, name: data.name, email: data.email, pan: data.pan };
  }
  // Fallback: client-side decode (no signature verification) for dev/demo
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
  if (payload.exp && (payload.exp as number) * 1000 < Date.now()) {
    throw new Error("Session expired");
  }
  return {
    userId: (payload.sub as string) || (payload.userId as string) || `user_${Date.now()}`,
    name: (payload.name as string) || "User",
    email: (payload.email as string) || "",
    pan: (payload.pan as string) || "XXXXX0000X",
  };
}

/**
 * Call the Quicko API via Firebase Cloud Function.
 * Set VITE_FIREBASE_QUICKO_FUNCTION_URL in .env to your deployed function URL, e.g.:
 * https://us-central1-YOUR_PROJECT.cloudfunctions.net/quickoApi
 */
const QUICKO_FUNCTION_URL =
  import.meta.env.VITE_FIREBASE_QUICKO_FUNCTION_URL || "";

/**
 * Wrong: https://name-xxx.run.app (browser → ERR_CERT_COMMON_NAME_INVALID).
 * Right: https://name-HASH-region.a.run.app OR https://region-project.cloudfunctions.net/name
 */
function assertValidFunctionUrl(url: string, envName: string): void {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".run.app") && !host.endsWith(".a.run.app")) {
      throw new Error(
        `${envName} looks invalid: "${host}" must use ".a.run.app" (e.g. quickoapi-xxxxx-us-central1.a.run.app) or prefer cloudfunctions.net: https://REGION-PROJECT.cloudfunctions.net/quickoApi — then rebuild the app.`
      );
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(`${envName} is not a valid URL: ${url}`);
    }
    throw e;
  }
}

export type QuickoAction =
  | "parse_form16"
  | "parse_ais"
  | "calculate_tax"
  | "prepare_itr"
  | "validate_itr"
  | "submit_itr";

export interface QuickoPayload {
  file?: string; // base64 for parse_form16 / parse_ais
  filename?: string;
  [key: string]: unknown;
}

/** Check if the error is retryable (network or server 5xx). */
function isRetryable(res: Response | null, err: unknown): boolean {
  if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("network")))
    return true;
  if (res && res.status >= 500 && res.status < 600) return true;
  return false;
}

export async function callQuickoApi<T = unknown>(
  action: QuickoAction,
  payload?: QuickoPayload,
  retried = false
): Promise<T> {
  if (!QUICKO_FUNCTION_URL) {
    throw new Error(
      "VITE_FIREBASE_QUICKO_FUNCTION_URL is not set. Add your Firebase function URL in .env"
    );
  }
  assertValidFunctionUrl(QUICKO_FUNCTION_URL, "VITE_FIREBASE_QUICKO_FUNCTION_URL");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("You appear to be offline. Check your connection and try again.");
  }

  let res: Response;
  try {
    res = await fetch(QUICKO_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: payload ?? {} }),
    });
  } catch (err) {
    if (!retried && isRetryable(null, err)) {
      return callQuickoApi(action, payload, true);
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
      throw new Error(
        "Cannot reach Quicko function. Use https://REGION-PROJECT.cloudfunctions.net/quickoApi (or the full *.a.run.app URL from deploy), rebuild, redeploy Hosting; ensure quickoApi allows unauthenticated invocations."
      );
    }
    throw new Error(`Request failed: ${msg}`);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (!retried && isRetryable(res, null)) {
      return callQuickoApi(action, payload, true);
    }
    const message = (data as { error?: string })?.error || res.statusText;
    throw new Error(message);
  }

  return data as T;
}

/** Convert a File to base64 for sending to the Quicko API (parse_form16 / parse_ais). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Safe number from unknown (Quicko may return string or number). */
function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

/** Map Quicko Form 16 parse response to draft fields. Handles common snake_case / camelCase. */
export function mapForm16ResponseToDraft(data: Record<string, unknown>): Record<string, number | string> {
  const get = (...args: string[]) => {
    for (const k of args) {
      const v = data[k];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };
  return {
    grossSalary: num(get("gross_salary", "grossSalary")),
    allowances: num(get("allowances")),
    professionalTax: num(get("professional_tax", "professionalTax")),
    standardDeduction: num(get("standard_deduction", "standardDeduction")) || 50000,
    netSalary: num(get("net_salary", "netSalary")),
    tdsDeducted: num(get("tds_deducted", "tdsDeducted")),
    employer: String(get("employer", "employer_name", "employerName") || ""),
    section80C: num(get("section_80c", "section80C", "80c")),
  };
}

/** Map Quicko AIS parse response to draft fields. */
export function mapAisResponseToDraft(data: Record<string, unknown>): Record<string, number | string> {
  const get = (...args: string[]) => {
    for (const k of args) {
      const v = data[k];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };
  return {
    savingsInterest: num(get("savings_interest", "savingsInterest", "interest_from_savings")),
    fdInterest: num(get("fd_interest", "fdInterest", "interest_from_fd")),
    dividendIncome: num(get("dividend_income", "dividendIncome", "dividends")),
    otherIncome: num(get("other_income", "otherIncome")),
    section80TTA: num(get("section_80tta", "section80TTA", "80tta")),
  };
}

/** Extract confidence from Quicko response (e.g. confidence, confidence_score, 0–100). */
export function getConfidenceFromResponse(data: Record<string, unknown>): number | null {
  const v = data.confidence ?? data.confidence_score ?? data.confidenceScore;
  if (typeof v === "number" && v >= 0 && v <= 100) return Math.round(v);
  if (typeof v === "string") return parseInt(v, 10) || null;
  return null;
}

// --- Phase 3: Filing flow ---

/** Build payload for Quicko prepare_itr / validate_itr / submit_itr (snake_case). */
export function buildQuickoItrPayload(draft: ITRDraft): Record<string, unknown> {
  return {
    assessment_year: draft.assessmentYear,
    regime: draft.regime,
    gross_salary: draft.grossSalary,
    allowances: draft.allowances,
    professional_tax: draft.professionalTax,
    standard_deduction: draft.standardDeduction,
    net_salary: draft.netSalary,
    tds_deducted: draft.tdsDeducted,
    employer: draft.employer,
    savings_interest: draft.savingsInterest,
    fd_interest: draft.fdInterest,
    dividend_income: draft.dividendIncome,
    other_income: draft.otherIncome,
    section_80c: draft.section80C,
    section_80d: draft.section80D,
    section_80g: draft.section80G,
    section_80tta: draft.section80TTA,
    home_loan_interest: draft.homeLoanInterest,
    has_house_property: draft.hasHouseProperty,
    rental_income: draft.rentalIncome,
    municipal_tax: draft.municipalTax,
  };
}

export interface FilingResult {
  arn: string;
  status?: string;
  itrVUrl?: string;
  itrJson?: string;
  needsManualUpload?: boolean;
}

/**
 * Run prepare → validate → submit. Returns ARN and optional ITR-V URL / ITR JSON.
 * If submit returns itr_json or no ARN, sets needsManualUpload and itrJson for download + portal instructions.
 */
export async function runFilingFlow(draft: ITRDraft): Promise<FilingResult> {
  const payload = buildQuickoItrPayload(draft);

  const prepared = await callQuickoApi<Record<string, unknown>>("prepare_itr", payload as QuickoPayload);
  await callQuickoApi("validate_itr", (prepared || payload) as QuickoPayload);

  const submitRes = await callQuickoApi<Record<string, unknown>>("submit_itr", (prepared || payload) as QuickoPayload);
  const res = submitRes as Record<string, unknown>;

  const arn = (res.arn ?? res.acknowledgement_number ?? res.acknowledgementNumber) as string | undefined;
  const itrVUrl = (res.itr_v_url ?? res.itrVUrl ?? res.itr_v_download_url) as string | undefined;
  const itrJson = (res.itr_json ?? res.itrJson) as string | undefined;

  if (arn) {
    return { arn, itrVUrl, status: (res.status as string) ?? "Submitted" };
  }

  if (itrJson) {
    return {
      arn: (res.reference_id ?? res.referenceId ?? "PENDING") as string,
      itrVUrl,
      itrJson,
      needsManualUpload: true,
      status: "Pending e-verification",
    };
  }

  throw new Error("No ARN or ITR JSON in response. Please try again or upload on the portal.");
}
