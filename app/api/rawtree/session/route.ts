import { revokeToken } from "@vercel/connect";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONNECTOR,
  NotConnectedError,
  rawtreeJson,
  readSession,
  sessionCookie,
  tokenParams,
} from "@/lib/rawtree-connect";
import type { SessionResponse } from "@/lib/rawtree-api";

/** Reports whether Connect is available and, when signed in, which organizations, clusters, and databases the viewer can pick. */
export async function GET(request: NextRequest) {
  if (!CONNECTOR) return Response.json({ enabled: false } satisfies SessionResponse);
  const session = readSession(request);
  if (!session) return Response.json({ enabled: true, connected: false } satisfies SessionResponse);

  try {
    const { organizations } = await rawtreeJson<{ organizations: { name: string }[] }>(session, "/v1/organizations");
    const workspaces = await Promise.all(organizations.map(async ({ name: organization }) => {
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
          ).then((body) => body.databases.map((database) => database.name), () => []);
          return { name, databases };
        })),
      };
    }));
    return Response.json({ enabled: true, connected: true, workspaces } satisfies SessionResponse);
  } catch (error) {
    if (error instanceof NotConnectedError) {
      return Response.json({ enabled: true, connected: false } satisfies SessionResponse);
    }
    throw error;
  }
}

/** Disconnects: revokes the viewer's Connect grant and forgets the browser session. */
export async function DELETE(request: NextRequest) {
  const session = readSession(request);
  if (CONNECTOR && session) {
    await revokeToken(CONNECTOR, tokenParams(session)).catch(() => {});
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(sessionCookie("", 0));
  return response;
}
