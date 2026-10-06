import { startAuthorization } from "@vercel/connect";
import { NextResponse, type NextRequest } from "next/server";
import { CONNECTOR, newSession, readSession, sessionCookie, tokenParams } from "@/lib/rawtree-connect";

/** Starts the RawTree consent flow through Vercel Connect and returns the viewer to the dashboard. */
export async function GET(request: NextRequest) {
  if (!CONNECTOR) return new Response("Vercel Connect is not configured.", { status: 404 });

  const session = readSession(request) ?? newSession();
  const { url } = await startAuthorization(CONNECTOR, tokenParams(session), {
    callbackUrl: new URL("/", request.nextUrl).toString(),
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(sessionCookie(session));
  return response;
}
