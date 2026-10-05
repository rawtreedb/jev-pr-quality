// Server-only helpers for the Vercel Connect sign-in. Never import from client components.
import { createHash, randomBytes } from "node:crypto";
import {
  deleteTokenCacheEntry,
  getToken,
  NoValidTokenError,
  UserAuthorizationRequiredError,
} from "@vercel/connect";
import type { NextRequest } from "next/server";
import { RAWTREE_API_URL } from "@/lib/rawtree-api";

/** Vercel Connect connector for the RawTree API, e.g. `rawtree/jev-pr-quality`. Unset disables Connect. */
export const CONNECTOR = process.env.RAWTREE_CONNECTOR || null;

const SESSION_COOKIE = "rawtree_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export class NotConnectedError extends Error {}

export function readSession(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value || null;
}

export function newSession(): string {
  return randomBytes(32).toString("base64url");
}

export function sessionCookie(value: string, maxAge = SESSION_MAX_AGE) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Each browser session is its own Connect subject. Only a hash leaves this server. */
export function tokenParams(session: string) {
  const id = createHash("sha256").update(session).digest("base64url");
  return { subject: { type: "user" as const, id } };
}

/** Calls the RawTree API as the signed-in viewer. Throws NotConnectedError when there is no usable grant. */
export async function rawtreeFetch(session: string, path: string, init: RequestInit = {}): Promise<Response> {
  if (!CONNECTOR) throw new NotConnectedError();
  let token: string;
  try {
    token = await getToken(CONNECTOR, tokenParams(session));
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError || error instanceof NoValidTokenError) {
      throw new NotConnectedError();
    }
    throw error;
  }

  const response = await fetch(new URL(path, RAWTREE_API_URL), {
    ...init,
    headers: { ...init.headers, Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    deleteTokenCacheEntry(CONNECTOR, tokenParams(session));
    throw new NotConnectedError();
  }
  return response;
}

export async function rawtreeJson<T>(session: string, path: string): Promise<T> {
  const response = await rawtreeFetch(session, path);
  if (!response.ok) throw new Error(`RawTree ${path} failed (${response.status})`);
  return response.json();
}
