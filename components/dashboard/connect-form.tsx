"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BarChart3, ChevronRight, Database, ExternalLink, GitPullRequest, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatedLines } from "@/components/dashboard/animated-lines";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { LINKS } from "@/lib/constants";
import { DEFAULT_TABLE } from "@/lib/dashboard-queries";
import { RAWTREE_API_URL, type RawtreeConfig, type RawtreeWorkspace, type SessionResponse } from "@/lib/rawtree-api";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS = [
  {
    icon: GitPullRequest,
    title: "Open a PR",
    body: "The GitHub Action sends the complete text diff, PR intent, and repository rules to Jev.",
  },
  {
    icon: Sparkles,
    title: "Jev scores it",
    body: "19 quality dimensions use typed answers. Every applicable one must score 7 or more.",
  },
  {
    icon: Database,
    title: "RawTree logs it",
    body: "Every run is appended to RawTree. Queries count only the latest review for each PR.",
  },
  {
    icon: BarChart3,
    title: "Compare quality",
    body: "See contributor rankings, repository quality, and trends over time.",
  },
];

const INPUT_CLASS =
  "h-12 w-full rounded-[10px] border bg-card px-3 text-[14px] text-muted-foreground outline-none transition-colors placeholder:text-[rgba(38,37,30,0.6)] hover:border-[#a1a1a1] focus:border-primary disabled:opacity-50";

function defaultDatabase(databases: string[]): string {
  return databases.find((name) => name === "jev_prs") ?? databases.find((name) => name === "default") ?? databases[0] ?? "";
}

function defaultTable(tables: string[]): string {
  return tables.includes(DEFAULT_TABLE) ? DEFAULT_TABLE : tables[0] ?? "";
}

export function ConnectForm({
  onConnect,
}: {
  onConnect: (config: RawtreeConfig) => void;
}) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [useApiKey, setUseApiKey] = useState(false);

  useEffect(() => {
    fetch("/api/rawtree/session")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then(setSession, () => setSession({ enabled: false }));
  }, []);

  async function disconnect() {
    await fetch("/api/rawtree/session", { method: "DELETE" });
    setSession({ enabled: true, connected: false });
  }

  const connectEnabled = session?.enabled === true;
  const showApiKey = session !== null && (!connectEnabled || useApiKey);

  return (
    <section className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <AnimatedLines />

      <div className="relative z-10 flex w-full max-w-[500px] flex-col gap-4">
        <div className="flex flex-col gap-2 px-6 pb-2">
          <p className="hidden text-subheading uppercase text-muted-foreground">Jev + RawTree</p>
          <h1 className="text-display-sm font-medium">Jev-Assisted Pull Request Quality</h1>
          <p className="text-body text-muted-foreground">
            Review complete pull request diffs with Jev, retain structured quality events in RawTree,
            and compare contributors and repositories without counting reruns twice.
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-panel border bg-card p-6">
          <div className="flex w-full flex-col gap-2">
            <h2 className="text-display-xs">Connect to RawTree</h2>
            {connectEnabled && (
              <div role="group" aria-label="Connection method" className="mt-2 grid grid-cols-2 gap-1 rounded-full border bg-surface-01 p-1 dark:bg-muted">
                {[
                  { label: "RawTree account", apiKey: false },
                  { label: "API key", apiKey: true },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={useApiKey === option.apiKey}
                    onClick={() => setUseApiKey(option.apiKey)}
                    className="h-9 rounded-full text-body font-semibold text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <p className="text-body">
              {showApiKey
                ? "Enter a read-only API key to load Jev pull request reviews and compare quality across contributors and repositories."
                : session?.enabled && session.connected
                  ? <>
                      Connected to RawTree. Choose where your Jev reviews are stored.{" "}
                      <button type="button" onClick={disconnect} className="font-medium text-primary underline-offset-4 hover:underline">
                        Disconnect
                      </button>
                    </>
                  : "Sign in with your RawTree account to load Jev pull request reviews and compare quality across contributors and repositories."}
            </p>
          </div>

          {session === null && <p className="text-body text-muted-foreground">Checking connection…</p>}

          {session?.enabled && !useApiKey && !session.connected && (
            <FormFooter>
              <a href="/api/rawtree/connect" className={cn(buttonVariants(), "ml-auto px-4")}>
                Connect
                <ChevronRight data-icon="inline-end" />
              </a>
            </FormFooter>
          )}

          {session?.enabled && !useApiKey && session.connected && (
            <WorkspacePicker workspaces={session.workspaces} onConnect={onConnect} />
          )}

          {showApiKey && <ApiKeyFields onConnect={onConnect} />}
        </div>

        <div className="relative overflow-hidden rounded-panel border border-brand-light bg-card p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: "calc(50% - 46.91px)", top: "calc(50% + 0.29px)", width: 658.179, height: 658.573 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/card-lines.svg" alt="" className="absolute block max-w-none" style={{ inset: "0 0 0 -17.02%" }} />
          </div>
          {showApiKey ? (
            <div className="relative flex flex-col gap-2 text-body">
              <p className="font-semibold">Your key never leaves this tab</p>
              <p className="text-muted-foreground">
                It stays in memory and is sent directly to{" "}
                <span className="text-foreground">RawTree</span>. It is never saved or sent to the
                dashboard server.
              </p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-2 text-body">
              <p className="font-semibold">No keys to copy or paste</p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Vercel Connect</span> holds your RawTree grant; this
                browser only keeps a session cookie. The dashboard runs its own fixed read queries and
                never accepts SQL from the browser. Disconnect revokes access.
              </p>
            </div>
          )}
        </div>
      </div>

      <figure className="relative z-10 mt-12 w-full max-w-[1120px] rounded-panel border bg-card p-3 sm:p-6">
        <figcaption className="mb-4 flex flex-col gap-1 px-2 pt-2 text-center sm:mb-6 sm:pt-0">
          <span className="text-display-xs">What you&apos;ll see</span>
          <span className="text-body text-muted-foreground">
            Contributor rankings, repository quality, and score trends. Preview uses sample data.
          </span>
        </figcaption>
        <Image
          src="/dashboard-preview.webp"
          alt="Dashboard preview with review totals, a contributor quality leaderboard, and a quality-over-time chart"
          width={1600}
          height={1451}
          sizes="(min-width: 1152px) 1072px, calc(100vw - 56px)"
          className="h-auto w-full rounded-card border"
        />
      </figure>

      <section aria-labelledby="how-it-works" className="relative z-10 mt-6 w-full max-w-[1120px] rounded-panel border bg-card p-6">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h2 id="how-it-works" className="text-display-xs">How it works</h2>
          <p className="text-body text-muted-foreground">From pull request to quality trend.</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex flex-col gap-3 rounded-card border bg-surface-01 p-4">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-light text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-caption text-muted-foreground">0{index + 1}</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-body text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-col gap-3 rounded-card border border-brand-light bg-brand-light/40 px-4 py-3 text-body sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {showApiKey
                ? "CI gets a write-only key. Your dashboard key stays in your browser."
                : "CI gets a write-only key. Viewers sign in with their own RawTree account."}
            </span>
          </p>
          <a
            href={`${LINKS.github}#how-it-works`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Technical details
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </section>
    </section>
  );
}

function ApiKeyFields({ onConnect }: { onConnect: (config: RawtreeConfig) => void }) {
  const [apiKey, setApiKey] = useState("");
  const [table, setTable] = useState(DEFAULT_TABLE);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConnect({ kind: "api-key", endpoint: RAWTREE_API_URL, apiKey: apiKey.trim(), table: table.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-end gap-6">
      <div className="flex w-full flex-col gap-2">
        <label htmlFor="api-key" className="text-body text-muted-foreground">
          Read-only API key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className={INPUT_CLASS}
          placeholder="rt_..."
          autoComplete="off"
          required
        />
        <p className="text-caption text-muted-foreground">
          Connecting to <span className="font-mono">{RAWTREE_API_URL.replace("https://", "")}</span>
          {process.env.NODE_ENV !== "production" && (
            <> · Local preview: type <span className="font-mono text-muted-foreground">demo</span> to load sample data</>
          )}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <label htmlFor="events-table" className="text-body text-muted-foreground">
          Events table
        </label>
        <input
          id="events-table"
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className={INPUT_CLASS}
          pattern="[A-Za-z][A-Za-z0-9_]{0,63}"
          title="Letters, numbers, and underscores, starting with a letter"
          autoComplete="off"
          required
        />
      </div>
      <FormFooter>
        <Button type="submit" className="ml-auto px-4">
          Load dashboard
          <ChevronRight data-icon="inline-end" />
        </Button>
      </FormFooter>
    </form>
  );
}

function WorkspacePicker({
  workspaces,
  onConnect,
}: {
  workspaces: RawtreeWorkspace[];
  onConnect: (config: RawtreeConfig) => void;
}) {
  const [organization, setOrganization] = useState(workspaces[0]?.organization ?? "");
  const clusters = workspaces.find((workspace) => workspace.organization === organization)?.clusters ?? [];
  const [cluster, setCluster] = useState(clusters[0]?.name ?? "");
  const databases = clusters.find((candidate) => candidate.name === cluster)?.databases ?? [];
  const [database, setDatabase] = useState(defaultDatabase(databases));

  // Tables are loaded per database; results and choices are keyed so a stale list is never shown.
  const tablesKey = [organization, cluster, database].join("\u0000");
  const [tableList, setTableList] = useState<{ key: string; tables: string[] } | null>(null);
  const [tableChoice, setTableChoice] = useState<{ key: string; table: string } | null>(null);
  useEffect(() => {
    if (!database) return;
    let cancelled = false;
    fetch(`/api/rawtree/tables?${new URLSearchParams({ organization, cluster, database })}`)
      .then((res) => (res.ok ? res.json() : { tables: [] }))
      .catch(() => ({ tables: [] }))
      .then(({ tables }: { tables: string[] }) => {
        if (!cancelled) setTableList({ key: tablesKey, tables });
      });
    return () => { cancelled = true; };
  }, [organization, cluster, database, tablesKey]);
  const tables = !database ? [] : tableList?.key === tablesKey ? tableList.tables : null;
  const table = tableChoice?.key === tablesKey ? tableChoice.table : defaultTable(tables ?? []);

  function selectOrganization(value: string) {
    const nextClusters = workspaces.find((workspace) => workspace.organization === value)?.clusters ?? [];
    setOrganization(value);
    setCluster(nextClusters[0]?.name ?? "");
    setDatabase(defaultDatabase(nextClusters[0]?.databases ?? []));
  }

  function selectCluster(value: string) {
    setCluster(value);
    setDatabase(defaultDatabase(clusters.find((candidate) => candidate.name === value)?.databases ?? []));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConnect({ kind: "connect", organization, cluster, database, table });
  }

  if (workspaces.length === 0) {
    return <p className="text-body text-muted-foreground">Your RawTree account has no organizations yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-end gap-6">
      <div className="grid w-full gap-4">
        <SearchSelect
          label="Organization"
          items={workspaces.map((workspace) => workspace.organization)}
          value={organization}
          onValueChange={selectOrganization}
          placeholder="Select an organization"
          emptyText="No organizations found."
        />
        <SearchSelect
          label="Cluster"
          items={clusters.map((candidate) => candidate.name)}
          value={cluster}
          onValueChange={selectCluster}
          placeholder={clusters.length ? "Select a cluster" : "No clusters in this organization"}
          emptyText="No clusters found."
        />
        <SearchSelect
          label="Database"
          items={databases}
          value={database}
          onValueChange={setDatabase}
          placeholder={databases.length ? "Select a database" : "No databases in this cluster"}
          emptyText="No databases found."
        />
        <SearchSelect
          label="Table"
          items={tables ?? []}
          value={table}
          onValueChange={(value) => setTableChoice({ key: tablesKey, table: value })}
          placeholder={tables === null ? "Loading tables…" : tables.length ? "Select a table" : "No tables in this database"}
          emptyText="No tables found."
        />
      </div>
      <FormFooter requestAccess={false}>
        <Button type="submit" className="ml-auto px-4" disabled={!organization || !cluster || !database || !table}>
          Load dashboard
          <ChevronRight data-icon="inline-end" />
        </Button>
      </FormFooter>
    </form>
  );
}

/** Bottom row shared by every connection form: request access on the left (until signed in), the primary action on the right. */
function FormFooter({ children, requestAccess = true }: { children: React.ReactNode; requestAccess?: boolean }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      {requestAccess && <p className="text-body text-muted-foreground">
        No RawTree account?{" "}
        <a
          href={LINKS.requestAccess}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Request access
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </p>}
      {children}
    </div>
  );
}
