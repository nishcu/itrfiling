"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickoApi = exports.verifyToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const form_data_1 = __importDefault(require("form-data"));
const jose = __importStar(require("jose"));
/** In-memory rate limit: IP -> { count, resetAt }. Window in ms. */
const rateLimitStore = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
function getClientIp(req) {
    var _a, _b, _c;
    const forwarded = req.headers["x-forwarded-for"] || "";
    return ((_a = forwarded.split(",")[0]) === null || _a === void 0 ? void 0 : _a.trim()) || ((_c = (_b = req.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) !== null && _c !== void 0 ? _c : "unknown");
}
function checkRateLimit(ip, maxPerWindow) {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);
    if (!entry) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return { allowed: true };
    }
    if (now >= entry.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return { allowed: true };
    }
    entry.count += 1;
    if (entry.count > maxPerWindow) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { allowed: true };
}
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Content-Type": "application/json",
};
/**
 * Quicko Connect: POST /authenticate with x-api-key + x-api-secret.
 * key_test_* → must use sandbox host (https://api.sandbox.co.in), not api.quicko.com.
 */
async function getQuickoToken(apiKey, apiSecret, baseUrl) {
    var _a, _b;
    const key = apiKey.trim();
    const secret = apiSecret.trim();
    const root = baseUrl.replace(/\/$/, "");
    const authRes = await fetch(`${root}/authenticate`, {
        method: "POST",
        headers: {
            "x-api-key": key,
            "x-api-secret": secret,
            "x-api-version": "1.0.0",
            "Content-Type": "application/json",
        },
    });
    if (!authRes.ok) {
        const errBody = await authRes.text();
        throw new Error(`Quicko auth failed [${authRes.status}]: ${errBody}`);
    }
    const json = (await authRes.json());
    const token = (_b = (_a = json.data) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : json.token;
    if (!token) {
        throw new Error("Quicko auth: no access_token in response");
    }
    return token;
}
/** Build FormData for file upload: payload.file as base64 string, payload.filename optional. */
function buildFileFormData(fileBase64, filename = "document.pdf") {
    const form = new form_data_1.default();
    const buf = Buffer.from(fileBase64, "base64");
    form.append("file", buf, { filename });
    return form;
}
const VERIFY_RATE_LIMIT_PER_MIN = 60;
const QUICKO_RATE_LIMIT_PER_MIN = 30;
// Secrets from Secret Manager – create in GCP Console → Security → Secret Manager
const itrJwtSecret = (0, params_1.defineSecret)("ITR_JWT_SECRET");
/** Named QUICKO_ACCESS_* to avoid Cloud Run conflict with legacy plain env QUICKO_API_KEY / QUICKO_API_SECRET. */
const quickoAccessKey = (0, params_1.defineSecret)("QUICKO_ACCESS_KEY");
const quickoAccessSecret = (0, params_1.defineSecret)("QUICKO_ACCESS_SECRET");
/**
 * Verify ZenithBooks JWT and return user claims.
 * POST body: { token: "eyJ..." } or GET ?token=eyJ...
 * Secret: ITR_JWT_SECRET in Secret Manager.
 */
exports.verifyToken = (0, https_1.onRequest)({ secrets: [itrJwtSecret] }, async (req, res) => {
    var _a, _b, _c;
    res.set(corsHeaders);
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, VERIFY_RATE_LIMIT_PER_MIN);
    if (!rate.allowed) {
        res.set("Retry-After", String((_a = rate.retryAfter) !== null && _a !== void 0 ? _a : 60));
        res.status(429).json({ error: "Too many requests. Try again later." });
        return;
    }
    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const token = req.method === "POST" && ((_b = req.body) === null || _b === void 0 ? void 0 : _b.token)
        ? req.body.token
        : ((_c = req.query) === null || _c === void 0 ? void 0 : _c.token) || "";
    if (!token) {
        res.status(400).json({ error: "Missing token" });
        return;
    }
    const secret = itrJwtSecret.value();
    try {
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jose.jwtVerify(token, secretKey);
        const userId = payload.sub ||
            payload.userId ||
            `user_${Date.now()}`;
        const name = payload.name || "User";
        const email = payload.email || "";
        const pan = payload.pan || "XXXXX0000X";
        res.status(200).json({ userId, name, email, pan });
    }
    catch (err) {
        console.error("JWT verify failed:", err);
        const isExpired = err instanceof Error && (err.message.includes("expired") || err.message.includes("jwt expired"));
        res.status(401).json({
            error: isExpired ? "Session expired" : "Invalid token",
        });
    }
});
/**
 * Quicko API proxy – runs all Quicko actions server-side.
 * Secrets: QUICKO_ACCESS_KEY, QUICKO_ACCESS_SECRET in Secret Manager (Quicko API key + secret).
 */
exports.quickoApi = (0, https_1.onRequest)({ secrets: [quickoAccessKey, quickoAccessSecret] }, async (req, res) => {
    var _a;
    res.set(corsHeaders);
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, QUICKO_RATE_LIMIT_PER_MIN);
    if (!rate.allowed) {
        res.set("Retry-After", String((_a = rate.retryAfter) !== null && _a !== void 0 ? _a : 60));
        res.status(429).json({ error: "Too many requests. Try again later." });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const apiKey = quickoAccessKey.value().trim();
    const apiSecret = quickoAccessSecret.value().trim();
    const envBase = (process.env.QUICKO_BASE_URL || "").replace(/\/$/, "");
    let QUICKO_BASE_URL = apiKey.startsWith("key_test_")
        ? "https://api.sandbox.co.in"
        : envBase || "https://api.quicko.com";
    try {
        const { action, payload } = req.body;
        if (!action) {
            res.status(400).json({ error: "Missing action" });
            return;
        }
        const token = await getQuickoToken(apiKey, apiSecret, QUICKO_BASE_URL);
        const authHeaders = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
        let result;
        switch (action) {
            case "parse_form16": {
                const fileBase64 = payload === null || payload === void 0 ? void 0 : payload.file;
                if (!fileBase64) {
                    res.status(400).json({ error: "Missing file (send as base64 in payload.file)" });
                    return;
                }
                const formData = buildFileFormData(fileBase64, (payload === null || payload === void 0 ? void 0 : payload.filename) || "form16.pdf");
                const formRes = await fetch(`${QUICKO_BASE_URL}/itr/form16/parse`, {
                    method: "POST",
                    headers: Object.assign(Object.assign({}, formData.getHeaders()), { Authorization: `Bearer ${token}` }),
                    body: formData,
                });
                if (!formRes.ok) {
                    throw new Error(`Form 16 parse failed [${formRes.status}]: ${await formRes.text()}`);
                }
                result = await formRes.json();
                break;
            }
            case "parse_ais": {
                const fileBase64 = payload === null || payload === void 0 ? void 0 : payload.file;
                if (!fileBase64) {
                    res.status(400).json({ error: "Missing file (send as base64 in payload.file)" });
                    return;
                }
                const formData = buildFileFormData(fileBase64, (payload === null || payload === void 0 ? void 0 : payload.filename) || "ais.pdf");
                const aisRes = await fetch(`${QUICKO_BASE_URL}/itr/ais/parse`, {
                    method: "POST",
                    headers: Object.assign(Object.assign({}, formData.getHeaders()), { Authorization: `Bearer ${token}` }),
                    body: formData,
                });
                if (!aisRes.ok) {
                    throw new Error(`AIS parse failed [${aisRes.status}]: ${await aisRes.text()}`);
                }
                result = await aisRes.json();
                break;
            }
            case "calculate_tax": {
                const calcRes = await fetch(`${QUICKO_BASE_URL}/itr/calculate`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(payload || {}),
                });
                if (!calcRes.ok) {
                    throw new Error(`Tax calc failed [${calcRes.status}]: ${await calcRes.text()}`);
                }
                result = await calcRes.json();
                break;
            }
            case "prepare_itr": {
                const prepRes = await fetch(`${QUICKO_BASE_URL}/itr/prepare`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(payload || {}),
                });
                if (!prepRes.ok) {
                    throw new Error(`ITR prepare failed [${prepRes.status}]: ${await prepRes.text()}`);
                }
                result = await prepRes.json();
                break;
            }
            case "validate_itr": {
                const valRes = await fetch(`${QUICKO_BASE_URL}/itr/validate`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(payload || {}),
                });
                if (!valRes.ok) {
                    throw new Error(`ITR validate failed [${valRes.status}]: ${await valRes.text()}`);
                }
                result = await valRes.json();
                break;
            }
            case "submit_itr": {
                const subRes = await fetch(`${QUICKO_BASE_URL}/itr/submit`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(payload || {}),
                });
                if (!subRes.ok) {
                    throw new Error(`ITR submit failed [${subRes.status}]: ${await subRes.text()}`);
                }
                result = await subRes.json();
                break;
            }
            default:
                res.status(400).json({ error: `Unknown action: ${action}` });
                return;
        }
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Quicko API error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});
//# sourceMappingURL=index.js.map