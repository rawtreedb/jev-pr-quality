import { buildDashboardSql, type DashboardFilters } from "./dashboard-queries.ts";
import { isDemoKey, runDemoQuery } from "./demo-data.ts";

export interface QueryResult {
  meta: { name: string; type: string }[];
  data: Record<string, unknown>[];
  rows: number;
  statistics: { elapsed: number; rows_read: number; bytes_read: number };
}

export const RAWTREE_API_URL = "https://api.rawtree.com";

/** Where dashboard queries run: directly with a pasted key, or through the Vercel Connect session. */
export type RawtreeConfig =
  | { kind: "api-key"; endpoint: string; apiKey: string; table: string }
  | { kind: "connect"; organization: string; cluster: string; database: string; table: string };

export interface RawtreeWorkspace {
  organization: string;
  clusters: { name: string; databases: string[] }[];
}

export type SessionResponse =
  | { enabled: false }
  | { enabled: true; connected: false }
  | { enabled: true; connected: true; workspaces: RawtreeWorkspace[] };

export function describeConfig(config: RawtreeConfig): string {
  if (config.kind === "api-key") return `${config.endpoint} · ${config.table}`;
  return `${config.organization} / ${config.cluster} / ${config.database} / ${config.table}`;
}

export async function runQuery(
  config: RawtreeConfig,
  queryId: string,
  filters: DashboardFilters = {},
): Promise<QueryResult> {
  if (config.kind === "connect") {
    const { organization, cluster, database, table } = config;
    return readResult(await fetch("/api/rawtree/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryId, filters, organization, cluster, database, table }),
    }));
  }

  const sql = buildDashboardSql(queryId, filters, config.table);
  if (isDemoKey(config.apiKey)) return runDemoQuery(sql);

  return readResult(await fetch(config.endpoint.replace(/\/+$/, "") + "/v1/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ sql }),
  }));
}

async function readResult(res: Response): Promise<QueryResult> {
  if (!res.ok) throw new Error(`Query failed (${res.status}): ${await res.text()}`);
  return res.json();
}
