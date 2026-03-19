#!/usr/bin/env node
/**
 * Environment checklist script (Phase 6).
 * Run from project root: node scripts/check-env.mjs
 * Reads .env and reports which required variables are set (non-empty).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");

const requiredFrontend = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_VERIFY_TOKEN_URL",
  "VITE_FIREBASE_QUICKO_FUNCTION_URL",
];

function parseEnv(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

let env = {};
if (existsSync(envPath)) {
  try {
    env = parseEnv(readFileSync(envPath, "utf8"));
  } catch (e) {
    console.error("Could not read .env:", e.message);
  }
} else {
  console.log("No .env file found. Create one from .env.example.\n");
}

console.log("Frontend (.env) checklist:\n");
let missing = 0;
for (const key of requiredFrontend) {
  const value = env[key];
  const ok = value && value.length > 0;
  if (!ok) missing++;
  console.log(`  ${ok ? "✓" : "✗"} ${key}`);
}
if (missing > 0) {
  console.log(`\n${missing} variable(s) missing or empty. See README → Environment checklist.`);
  process.exitCode = 1;
} else {
  console.log("\nAll listed frontend variables are set.");
}

function badRunAppUrl(value) {
  if (!value || !value.startsWith("http")) return false;
  try {
    const h = new URL(value).hostname;
    return h.endsWith(".run.app") && !h.endsWith(".a.run.app");
  } catch {
    return false;
  }
}
for (const key of ["VITE_FIREBASE_VERIFY_TOKEN_URL", "VITE_FIREBASE_QUICKO_FUNCTION_URL"]) {
  if (badRunAppUrl(env[key])) {
    console.log(
      `\n⚠ ${key}: hostname looks wrong (*.run.app without .a.). Browsers show ERR_CERT_COMMON_NAME_INVALID.\n  Use: https://REGION-PROJECT.cloudfunctions.net/... (see README).`
    );
    process.exitCode = process.exitCode || 1;
  }
}

console.log("\nFirebase Functions (set via firebase functions:config:set or Console):");
console.log("  • ITR_JWT_SECRET (or itr.jwt_secret)");
console.log("  • QUICKO_API_KEY, QUICKO_API_SECRET (or quicko.api_key / quicko.api_secret)");
