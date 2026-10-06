import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { runQuery } from "./rawtree-api.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stubFetch() {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return Response.json({ meta: [], data: [], rows: 0, statistics: { elapsed: 0, rows_read: 0, bytes_read: 0 } });
  }) as typeof fetch;
  return calls;
}

test("Connect mode sends a query ID to the dashboard server, never SQL or a token", async () => {
  const calls = stubFetch();
  const filters = { repository: "acme/api" };
  await runQuery({ kind: "connect", organization: "acme", cluster: "main", database: "jev_prs", table: "team_reviews" }, "stats", filters);
  assert.equal(calls[0].url, "/api/rawtree/query");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    queryId: "stats", filters, organization: "acme", cluster: "main", database: "jev_prs", table: "team_reviews",
  });
  assert.equal(new Headers(calls[0].init?.headers).get("Authorization"), null);
});

test("API-key mode builds the SQL in the browser and calls RawTree directly", async () => {
  const calls = stubFetch();
  await runQuery({ kind: "api-key", endpoint: "https://api.rawtree.com/", apiKey: "rt_read", table: "team_reviews" }, "repositories");
  assert.equal(calls[0].url, "https://api.rawtree.com/v1/query");
  assert.equal(new Headers(calls[0].init?.headers).get("Authorization"), "Bearer rt_read");
  assert.match(JSON.parse(String(calls[0].init?.body)).sql, /FROM team_reviews\n/);
});

test("surfaces the status of a failed query", async () => {
  globalThis.fetch = (async () => new Response("RawTree session expired. Connect again.", { status: 401 })) as typeof fetch;
  await assert.rejects(
    runQuery({ kind: "connect", organization: "a", cluster: "b", database: "c", table: "d" }, "stats"),
    /Query failed \(401\): RawTree session expired/,
  );
});
