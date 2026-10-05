// Server-only helpers for the Vercel Connect sign-in. Never import from client components.
import { createHash, randomBytes } from "node:crypto";
import {
  deleteTokenCacheEntry,
  getToken,
  NoValidTokenError,
  UserAuthorizationRequiredError,
} from "@vercel/connect";
import type { NextRequest } from "next/server";
import { buildDashboardSql } from "./dashboard-queries.ts";
import { RAWTREE_API_URL, type RawtreeWorkspace } from "./rawtree-api.ts";

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

  const started = Date.now();
  const response = await fetch(new URL(path, RAWTREE_API_URL), {
    ...init,
    headers: { ...init.headers, Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // One outcome line per RawTree call. Organization, cluster, and database names are logged; tokens, SQL, and bodies are not.
  const outcome = `RawTree ${init.method ?? "GET"} ${path} -> ${response.status} in ${Date.now() - started} ms`;
  if (response.ok) console.info(outcome);
  else console.warn(outcome);
  if (response.status === 401) {
    console.warn("RawTree rejected the Connect token; the viewer must reconnect.");
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

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Turns a browser request into a RawTree query: the location from the body, the SQL from the dashboard's own queries.
 * The RawTree OAuth grant is not read-only, so SQL is never accepted from the browser. Throws on invalid input.
 */
export function buildQueryRequest(body: unknown): { path: string; sql: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const filters = (input.filters ?? {}) as Record<string, unknown>;
  const organization = text(input.organization);
  const cluster = text(input.cluster);
  const database = text(input.database);
  const table = text(input.table);
  if (!organization || !cluster || !database || !table) {
    throw new Error("organization, cluster, database, and table are required.");
  }
  const sql = buildDashboardSql(String(input.queryId), {
    repository: text(filters.repository),
    dateFrom: text(filters.dateFrom),
    dateTo: text(filters.dateTo),
  }, table);
  return { path: `/v1/query?${new URLSearchParams({ organization, cluster, database })}`, sql };
}

/** Lists every organization, cluster, and database the viewer can pick. */
export async function loadWorkspaces(session: string): Promise<RawtreeWorkspace[]> {
  const { organizations } = await rawtreeJson<{ organizations: { name: string }[] }>(session, "/v1/organizations");
  return Promise.all(organizations.map(async ({ name: organization }) => {
    const { clusters } = await rawtreeJson<{ clusters: { name: string }[] }>(
      session,
      `/v1/clusters?${new URLSearchParams({ organization })}`,
    );
    return {
      organization,
      clusters: await Promise.all(clusters.map(async ({ name }) => {
        // A paused or unreachable cluster lists no databases instead of failing the whole picker.
        const databases = await rawtreeJson<{ databases: { name: string }[] }>(
          session,
          `/v1/databases?${new URLSearchParams({ organization, cluster: name })}`,
        ).then((body) => body.databases.map((database) => database.name), (error) => {
          console.warn(`Could not list databases for ${organization}/${name}: ${error instanceof Error ? error.message : error}`);
          return [];
        });
        return { name, databases };
      })),
    };
  }));
}
