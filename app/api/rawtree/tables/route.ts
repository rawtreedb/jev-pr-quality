import type { NextRequest } from "next/server";
import { NotConnectedError, rawtreeJson, readSession } from "@/lib/rawtree-connect";

/** Lists the tables in the database the viewer picked, so the events table can be chosen from fixed options. */
export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) return new Response("Connect RawTree first.", { status: 401 });

  const { searchParams } = request.nextUrl;
  const organization = searchParams.get("organization");
  const cluster = searchParams.get("cluster");
  const database = searchParams.get("database");
  if (!organization || !cluster || !database) {
    return new Response("organization, cluster, and database are required.", { status: 400 });
  }

  try {
    const { tables } = await rawtreeJson<{ tables: { name: string }[] }>(
      session,
      `/v1/tables?${new URLSearchParams({ organization, cluster, database })}`,
    );
    return Response.json({ tables: tables.map((table) => table.name) });
  } catch (error) {
    if (error instanceof NotConnectedError) return new Response("RawTree session expired. Connect again.", { status: 401 });
    throw error;
  }
}
