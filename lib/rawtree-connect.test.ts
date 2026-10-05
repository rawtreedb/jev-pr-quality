import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

class UserAuthorizationRequiredError extends Error {}
class NoValidTokenError extends Error {}

const connect = {
  getToken: mock.fn<(connector: string, params: unknown) => Promise<string>>(async () => "connect-token"),
  deleteTokenCacheEntry: mock.fn<(connector: string, params: unknown) => void>(() => {}),
};
mock.module("@vercel/connect", {
  namedExports: {
    getToken: (connector: string, params: unknown) => connect.getToken(connector, params),
    deleteTokenCacheEntry: (connector: string, params: unknown) => connect.deleteTokenCacheEntry(connector, params),
    UserAuthorizationRequiredError,
    NoValidTokenError,
  },
});
process.env.RAWTREE_CONNECTOR = "rawtree/test";
const { buildQueryRequest, loadWorkspaces, NotConnectedError, rawtreeFetch, tokenParams } = await import("./rawtree-connect.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  connect.getToken.mock.resetCalls();
  connect.deleteTokenCacheEntry.mock.resetCalls();
});

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return handler(String(input), init);
  }) as typeof fetch;
  return calls;
}

test("only a hash of the browser session is sent to Vercel Connect", () => {
  const { subject } = tokenParams("browser-session");
  assert.equal(subject.type, "user");
  assert.notEqual(subject.id, "browser-session");
  assert.doesNotMatch(subject.id, /browser-session/);
  assert.equal(subject.id, tokenParams("browser-session").subject.id);
  assert.notEqual(subject.id, tokenParams("other-session").subject.id);
});

test("calls RawTree with the viewer's Connect token", async () => {
  const calls = stubFetch(() => Response.json({ ok: true }));
  await rawtreeFetch("browser-session", "/v1/organizations");
  assert.equal(calls[0].url, "https://api.rawtree.com/v1/organizations");
  assert.equal(new Headers(calls[0].init?.headers).get("Authorization"), "Bearer connect-token");
  assert.deepEqual(connect.getToken.mock.calls[0].arguments, ["rawtree/test", tokenParams("browser-session")]);
});

test("a missing or expired grant becomes NotConnectedError, other Connect failures propagate", async () => {
  const calls = stubFetch(() => Response.json({}));
  connect.getToken.mock.mockImplementationOnce(async () => { throw new UserAuthorizationRequiredError(); });
  await assert.rejects(rawtreeFetch("s", "/v1/organizations"), NotConnectedError);
  connect.getToken.mock.mockImplementationOnce(async () => { throw new NoValidTokenError(); });
  await assert.rejects(rawtreeFetch("s", "/v1/organizations"), NotConnectedError);
  connect.getToken.mock.mockImplementationOnce(async () => { throw new Error("Connector not found"); });
  await assert.rejects(rawtreeFetch("s", "/v1/organizations"), /Connector not found/);
  assert.equal(calls.length, 0);
});

test("a token RawTree rejects is dropped from the cache so the next call re-fetches it", async () => {
  stubFetch(() => new Response("revoked", { status: 401 }));
  await assert.rejects(rawtreeFetch("s", "/v1/organizations"), NotConnectedError);
  assert.deepEqual(connect.deleteTokenCacheEntry.mock.calls[0].arguments, ["rawtree/test", tokenParams("s")]);
});

test("builds the RawTree query from a query ID, never from browser SQL", () => {
  const { path, sql } = buildQueryRequest({
    queryId: "stats",
    organization: "acme",
    cluster: "prod eu",
    database: "jev_prs",
    table: "team_reviews",
    filters: { repository: "acme/api", dateFrom: "2026-09-01", dateTo: "2026-09-30" },
    sql: "DROP TABLE team_reviews",
  });
  assert.equal(path, "/v1/query?organization=acme&cluster=prod+eu&database=jev_prs");
  assert.match(sql, /FROM team_reviews\n/);
  assert.match(sql, /repository::Nullable\(String\) = 'acme\/api'/);
  assert.match(sql, />= '2026-09-01'/);
  assert.doesNotMatch(sql, /DROP/);
});

test("rejects incomplete locations, unknown queries, and unsafe values", () => {
  const valid = { queryId: "stats", organization: "acme", cluster: "main", database: "jev_prs", table: "jev_pr_reviews" };
  for (const field of ["organization", "cluster", "database", "table"]) {
    assert.throws(() => buildQueryRequest({ ...valid, [field]: "" }), /are required/, field);
    assert.throws(() => buildQueryRequest({ ...valid, [field]: 42 }), /are required/, field);
  }
  assert.throws(() => buildQueryRequest(null), /are required/);
  assert.throws(() => buildQueryRequest({ ...valid, queryId: "SELECT 1" }), /Unknown dashboard query/);
  assert.throws(() => buildQueryRequest({ ...valid, table: "jev_pr_reviews; DROP TABLE x" }), /Invalid table name/);
  assert.throws(() => buildQueryRequest({ ...valid, filters: { repository: "a/b' OR 1=1" } }), /Invalid repository/);
  // Non-string filters are ignored rather than coerced into SQL.
  assert.doesNotMatch(buildQueryRequest({ ...valid, filters: { repository: ["acme/api"] } }).sql, /acme\/api/);
});

test("lists organizations, clusters, and databases, tolerating clusters that cannot list databases", async () => {
  const calls = stubFetch((url) => {
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/v1/organizations") return Response.json({ organizations: [{ name: "acme" }, { name: "beta co" }] });
    if (pathname === "/v1/clusters") {
      return Response.json({ clusters: searchParams.get("organization") === "acme" ? [{ name: "main" }, { name: "paused" }] : [] });
    }
    if (searchParams.get("cluster") === "paused") return new Response("cluster paused", { status: 503 });
    return Response.json({ databases: [{ name: "default" }, { name: "jev_prs" }] });
  });

  assert.deepEqual(await loadWorkspaces("s"), [
    { organization: "acme", clusters: [{ name: "main", databases: ["default", "jev_prs"] }, { name: "paused", databases: [] }] },
    { organization: "beta co", clusters: [] },
  ]);
  assert.ok(calls.some((call) => call.url.endsWith("/v1/clusters?organization=beta+co")));
  assert.ok(calls.some((call) => call.url.endsWith("/v1/databases?organization=acme&cluster=main")));
});

test("a failed organization or cluster listing is not hidden as an empty workspace", async () => {
  stubFetch((url) => (new URL(url).pathname === "/v1/organizations"
    ? Response.json({ organizations: [{ name: "acme" }] })
    : new Response("boom", { status: 500 })));
  await assert.rejects(loadWorkspaces("s"), /\/v1\/clusters\?organization=acme failed \(500\)/);
});
