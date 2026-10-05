# Jev PR Quality

[![CI](https://github.com/rawtreedb/jev-pr-quality/actions/workflows/ci.yml/badge.svg)](https://github.com/rawtreedb/jev-pr-quality/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Add Jev-assisted pull request reviews and a live quality dashboard in two
minutes.**

## Get running in two minutes

### 1. Copy the workflow

Copy [`examples/jev-review.yml`](examples/jev-review.yml) into
`.github/workflows/jev-review.yml` in your repository, or run:

```sh
mkdir -p .github/workflows
curl -L https://raw.githubusercontent.com/rawtreedb/jev-pr-quality/main/examples/jev-review.yml \
  -o .github/workflows/jev-review.yml
```

### 2. Add two GitHub Actions secrets

In your repository, open **Settings → Secrets and variables → Actions** and add:

| Secret | Get it from | Access |
| --- | --- | --- |
| `JEV_API_KEY` | [TypeSafe console](https://console.typesafe.ai/keys) | Jev evaluation |
| `RAWTREE_JEV_API_KEY` | [RawTree](https://rawtree.com) → **Settings → API keys** | Write-only |

Create a RawTree database (for example, `jev_prs`) and make it the write key's
default database. For several repositories, use organization secrets scoped to
the repositories you want to review.

### 3. See it live

Create a separate RawTree **read-only** key with the **same default database** as
the write key. Open the [live dashboard](https://jev-pr-quality.rawtree.tech) and
paste it in. The key stays in browser memory and is sent directly to RawTree.

[![Jev PR Quality dashboard showing pull request quality across repositories](public/dashboard-preview.webp)](https://jev-pr-quality.rawtree.tech)

That is it. Each new PR gets a Jev review comment and quality check, while its
structured score is appended to RawTree and appears in the dashboard.

## How it works

```text
Pull request
    │
    ▼
Jev review ──────► PR comment + required check
    │
    ▼
RawTree event ───► Multi-repository dashboard
```

Jev evaluates the complete PR diff across 19 typed software-quality dimensions.
The GitHub Action publishes the result on the PR, optionally appends a structured
event to RawTree, and fails when any applicable dimension is below the configured
threshold. The included dashboard keeps only the latest run for each
`(repository, pull request)` before calculating scores.

- **One action:** review, comment, artifact, quality gate, and event logging.
- **Multi-repository by default:** compare an organization or focus on one repo.
- **Sign in with RawTree:** on Vercel, viewers authorize through Vercel Connect instead of pasting keys.
- **Self-hosted frontend:** deploy with Node.js or Docker; viewers paste a read-only key.
- **Safe token split:** CI gets a write-only key; viewers use their own RawTree access.

`@main` is the preview channel while the project is under review. Pin the first
stable `@v1` release when it is published.

Every event contains `github.repository`, so several repositories can safely
write to one RawTree database and appear together in the dashboard.

## Why Jev?

Most AI code review produces prose: useful in the moment, difficult to compare,
and quickly lost in a PR timeline. Jev produces typed, repeatable ratings across
19 software-quality dimensions. That makes the review both actionable now and
measurable later.

Jev reviews the complete PR diff rather than a sample. A PR fails when any
applicable dimension falls below the threshold, so one critical weakness cannot
hide behind a good average. Tests remain the source of truth and humans retain
the final decision; Jev adds a consistent quality lens between them.

## Configuration

The defaults are the public convention and normally should not be changed:

| Setting | Default |
| --- | --- |
| Minimum score | `7` |
| RawTree API | `https://api.rawtree.com` |
| Table | `jev_pr_reviews` |
| Database | API key's default database |

Override the database, table, or endpoint only to isolate a private installation.
The dashboard defaults to `jev_pr_reviews` but lets viewers pick another table.
Never distribute a shared write token in a public workflow or frontend.

## Public dashboard, private data

The frontend itself is safe to publish. It contains no credentials, and data
visibility is controlled by each viewer's own RawTree access, not by the
deployment being public or private. Viewers connect in one of two ways:

- **Vercel Connect (when `RAWTREE_CONNECTOR` is set).** The viewer clicks
  **Connect with RawTree**, approves access, then picks the organization,
  cluster, and database that hold the Jev reviews. Vercel Connect stores and
  refreshes the RawTree grant per browser session; the browser holds only an
  opaque, HTTP-only session cookie. **Disconnect** revokes the grant. RawTree
  OAuth grants are not read-only, so the dashboard's server routes run only the
  dashboard's fixed queries and never accept SQL from the browser.
- **API key.** The viewer pastes a RawTree read-only key, which stays in that
  browser tab's memory and is sent directly to RawTree.

## Self-host the dashboard

Requirements: Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000> and enter a RawTree **read-only** key. The key stays
in the browser tab's memory and is sent directly to `https://api.rawtree.com`.
It is never persisted or sent to the dashboard server.

The dashboard starts with all repositories combined and provides a repository
selector. It compares only real `jev_pr_review` events on rubric version `1`;
unrelated records are excluded.

### Vercel

Import this repository as a Next.js project with the repository root as the root
directory. Set `NEXT_PUBLIC_SITE_URL` to your public URL so shared links use
your domain in their preview image and canonical metadata. Do not add either API
key to Vercel: the write-only key belongs in GitHub Actions.

To let viewers sign in instead of pasting keys, create a Vercel Connect
connector for the RawTree API from the linked project directory and expose its
UID as `RAWTREE_CONNECTOR`:

```sh
vercel link
vercel connect create rawtree --target api --name jev-pr-quality
vercel env add RAWTREE_CONNECTOR   # e.g. rawtree/jev-pr-quality
```

For local development with Connect, run `vercel env pull` so the SDK can use
the project's OIDC token. Without `RAWTREE_CONNECTOR`, the dashboard falls back
to API-key mode.

### Docker

```sh
docker build -t jev-pr-quality .
docker run --rm -p 3000:3000 jev-pr-quality
```

The image runs as an unprivileged user and contains no credentials. Put TLS in
front of it before asking users to enter read keys. Vercel Connect requires a
Vercel deployment, so Docker installations use API-key mode.

## What Jev receives

The action sends the PR title and body, the complete three-dot Git diff with 20
lines of context, and root `AGENTS.md` when present. It does not execute PR code
or upload the full repository. Jev reviews the text diff; changed binary files
and generated dependency lockfiles (such as `package-lock.json`, `yarn.lock`,
`pnpm-lock.yaml`, or `Cargo.lock`) are listed as not assessed in the PR comment
and report. Manifest changes such as `package.json` remain in the reviewed diff.
Large diffs and PRs that only change binary files or lockfiles fail closed
rather than producing a misleading review.

Jev is an advisory review signal that complements tests and human review. Scores
are model judgments, not proof of correctness. Historical comparisons should use
the same rubric and model period.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup,
checks, and event-schema expectations.

## Development

```sh
npm ci
npm run lint
npm run build
npm test
npm ci --ignore-scripts --prefix scripts/jev-review
npm test --prefix scripts/jev-review
```

## Attribution and licenses

Rubric data and question wording are adapted from
[NiazMorshed2007/jev-review](https://github.com/NiazMorshed2007/jev-review), commit
`57690af54ef7d862c2483342c1e61c14dffcf727`, under MIT. Its notice is retained in
[`scripts/jev-review/LICENSE`](scripts/jev-review/LICENSE). The rest of this
repository is licensed under Apache-2.0.
