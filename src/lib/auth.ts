import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Minimal stateless admin session: an HMAC-signed expiry timestamp in an
// httpOnly cookie. Enough for a single shared admin password; swap for
// Auth.js + roles when the team grows.

export const SESSION_COOKIE = "bp_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "cynbit-demo";
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, adminPassword());
}

export function createSessionToken(): string {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
