import type { NextRequest } from "next/server";
import { buildDashboardSql } from "@/lib/dashboard-queries";
import { NotConnectedError, rawtreeFetch, readSession } from "@/lib/rawtree-connect";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Runs one of the dashboard's own queries as the signed-in viewer.
 * The RawTree OAuth grant is not read-only, so this route never accepts SQL from the browser.
 */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) return new Response("Connect RawTree first.", { status: 401 });

  const body = await request.json().catch(() => null);
  const organization = text(body?.organization);
  const cluster = text(body?.cluster);
  const database = text(body?.database);
  const table = text(body?.table);
  if (!organization || !cluster || !database || !table) {
    return new Response("organization, cluster, database, and table are required.", { status: 400 });
  }

  let sql: string;
  try {
    sql = buildDashboardSql(String(body.queryId), {
      repository: text(body.filters?.repository),
      dateFrom: text(body.filters?.dateFrom),
      dateTo: text(body.filters?.dateTo),
    }, table);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Invalid query.", { status: 400 });
  }

  try {
    const response = await rawtreeFetch(
      session,
      `/v1/query?${new URLSearchParams({ organization, cluster, database })}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql }) },
    );
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    if (error instanceof NotConnectedError) return new Response("RawTree session expired. Connect again.", { status: 401 });
    throw error;
  }
}
