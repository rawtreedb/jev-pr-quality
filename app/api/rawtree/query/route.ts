import type { NextRequest } from "next/server";
import { buildQueryRequest, NotConnectedError, rawtreeFetch, readSession } from "@/lib/rawtree-connect";

/** Runs one of the dashboard's own queries as the signed-in viewer. */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) return new Response("Connect RawTree first.", { status: 401 });

  let query: { path: string; sql: string };
  try {
    query = buildQueryRequest(await request.json().catch(() => null));
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Invalid query.", { status: 400 });
  }

  try {
    const response = await rawtreeFetch(session, query.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: query.sql }),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    if (error instanceof NotConnectedError) return new Response("RawTree session expired. Connect again.", { status: 401 });
    throw error;
  }
}
