"use client";

import { useState } from "react";
import Image from "next/image";
import { BarChart3, ChevronRight, Database, ExternalLink, GitPullRequest, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatedLines } from "@/components/dashboard/animated-lines";
import { Button } from "@/components/ui/button";
import { LINKS } from "@/lib/constants";
import { RAWTREE_API_URL, type RawtreeConfig } from "@/lib/rawtree-api";

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

export function ApiKeyForm({
  onConnect,
}: {
  onConnect: (config: RawtreeConfig) => void;
}) {
  const [apiKey, setApiKey] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const config = { endpoint: RAWTREE_API_URL, apiKey: apiKey.trim() };
    onConnect(config);
  }

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
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-end gap-6 rounded-panel border bg-card p-6"
        >
          <div className="flex w-full flex-col gap-2">
            <h2 className="text-display-xs">Connect to RawTree</h2>
            <p className="text-body">
              Enter a read-only API key to load Jev pull request reviews and compare quality
              across contributors and repositories.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor="api-key" className="text-body text-muted-foreground">
              Read-only API key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-12 w-full rounded-[10px] border bg-card px-3 text-[14px] text-muted-foreground outline-none transition-colors placeholder:text-[rgba(38,37,30,0.6)] hover:border-[#a1a1a1] focus:border-primary disabled:opacity-50"
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

          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <p className="text-body text-muted-foreground">
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
            </p>
            <Button type="submit" className="ml-auto px-4">
              Load dashboard
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </form>

        <div className="relative overflow-hidden rounded-panel border border-brand-light bg-card p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: "calc(50% - 46.91px)", top: "calc(50% + 0.29px)", width: 658.179, height: 658.573 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/card-lines.svg" alt="" className="absolute block max-w-none" style={{ inset: "0 0 0 -17.02%" }} />
          </div>
          <div className="relative flex flex-col gap-2 text-body">
            <p className="font-semibold">Your key never leaves this tab</p>
            <p className="text-muted-foreground">
              It stays in memory and is sent directly to{" "}
              <span className="text-foreground">RawTree</span>. It is never saved or sent to the
              dashboard server.
            </p>
          </div>
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
          <p className="text-body text-muted-foreground">From pull request to quality trend, without a dashboard backend.</p>
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
            <span>CI gets a write-only key. Your dashboard key stays in your browser.</span>
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
