import { revokeToken } from "@vercel/connect";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONNECTOR,
  loadWorkspaces,
  NotConnectedError,
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
    const workspaces = await loadWorkspaces(session);
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
