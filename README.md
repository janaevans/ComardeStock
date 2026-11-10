# Tribunal — Multi-Agent AI Stock Analysis & Investment Risk Platform

A Next.js web application where a **Bull analyst**, a **Bear analyst** and an **independent Judge** (AI agents) debate a stock using sourced market data and deterministic calculations, and produce a structured risk report.

> Educational research and decision support only. Not personalised investment advice. Does not execute trades.

## Build status

| Phase | Scope | Status |
|---|---|---|
| **1** | Project setup, database, authentication, dashboard, stock search, market-data integration | **Done (this delivery)** |
| 2 | Technical indicators, risk & position sizing, data validation, news | Not started |
| 3 | Claude/OpenAI provider layer, Bull, Bear, Judge agents | Not started |
| 4 | Debate orchestration, background jobs, SSE streaming, persistence | Not started |
| 5 | Final report, full charts, Markdown/JSON export | Not started |
| 6 | Hardening, security review, deployment validation | Not started |

### What Phase 1 delivers

- **Next.js 16 App Router, JavaScript only** (`.js`/`.jsx`), Tailwind CSS v4, Recharts, Lucide icons.
- **PostgreSQL schema** (Prisma 7, `@prisma/adapter-pg`) for every table in the spec, plus `watchlist_items`. Includes indexes, cascades and row-level security enabled (it blocks Supabase's public REST API from reading these tables).
- **Authentication** with Supabase Auth (email + password, email confirmation callback). The session is refreshed in `src/proxy.js`. Every page and API route checks the user itself. A `dev-local` mode exists for laptop trials; it is refused on Vercel.
- **Market-data engine** with a provider adapter interface (`searchSymbols`, `getQuote`, `getHistory`, `getProfile`, `getFundamentals`):
  - **Twelve Data** adapter (recommended: NSE, BSE, NYSE, Nasdaq, LSE).
  - **Alpha Vantage** adapter (US, BSE `.BSE`, LSE `.LON`; NSE is refused with a clear message).
  - Every record carries **provenance**: source, retrieval time, as-of date, currency, frequency, and freshness (`real-time` / `delayed` / `end-of-day` / `periodic` / `unknown`) plus a `stale` flag. Intraday data is labelled **delayed**. It is labelled real-time only if the operator declares a real-time plan in `MARKET_DATA_REALTIME_EXCHANGES`.
  - Typed errors for rate limits, invalid tickers, unsupported exchanges, plan restrictions, missing data, provider downtime and timeouts. Requests time out, and only transient failures are retried; 429s are never retried, to save credits.
  - No figures are invented. Missing values show as "—", and plan-restricted fundamentals sections are listed as unavailable.
- **Stock search with mandatory confirmation.** Ambiguous matches (multiple listings, or US results where the provider doesn't say NYSE vs Nasdaq) are always shown for the user to pick from. Nothing is analysed silently.
- **Stock overview**: company, ticker, exchange, latest available price, currency, last-updated time, source, market status, OHLC/volume/52-week, a daily price + volume chart (1M–5Y), company profile, on-demand fundamentals, watchlist toggle, and an **Analyze Stock** form with optional settings. Every setting can be skipped, and nothing is assumed.
- **Dashboard**: search, exchange selector, market status, recently analysed stocks, saved analyses, analysis history, API configuration status and watchlist.
- **Provider settings**: per-user Anthropic, OpenAI, Twelve Data and Alpha Vantage keys, encrypted with **AES-256-GCM** and shown only as `••••last4`. There is also a preferred market-data provider setting.
- **Security**: Zod validation on every input, same-origin checks on writes, per-user rate limits, security headers and CSP, structured JSON logs with key redaction, safe post-login redirects, and user-scoped queries everywhere.
- **102 automated tests**: unit tests with mocked providers, plus database tests against a real Postgres.

### Honest limitations of Phase 1

- **Analyses are created as `PENDING` records only.** The agent debate that processes them is built in Phases 3–4. The analysis page says so plainly.
- **Live provider APIs and Supabase were not reachable from the build environment.** The adapters were tested against fixtures that follow the providers' documented response shapes, and end-to-end against a local mock server (`scripts/mock-market-server.mjs`). They have **not yet been tested against the real Twelve Data / Alpha Vantage / Supabase services**. Verify with your own keys (see "First-run verification"). Fundamentals field mappings in particular should be checked against real payloads in Phase 2.
- Market open/closed status is based on regular trading hours. **Exchange holidays are not reflected** (the UI states this). Twelve Data's own `is_market_open` flag is used when present.
- The in-memory rate limiter and response cache are per server instance. For a strict global quota on Vercel, back `rateLimit.js` with Redis (e.g. Upstash); the interface is ready for it.
- The Prisma migration SQL was written by hand, because Prisma's schema-engine binary could not be downloaded in the build environment. It was applied to PostgreSQL 16 and exercised by the DB tests. Run `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` once locally; it should report no differences.

## Folder structure

```
prisma/
  schema.prisma                 # data model
  migrations/20261110000000_init/migration.sql
prisma.config.mjs               # Prisma 7 config (DATABASE_URL / DIRECT_URL)
scripts/mock-market-server.mjs  # offline Twelve Data mock for local E2E checks
src/
  proxy.js                      # session refresh + redirect for signed-out users
  app/
    page.js  about/  login/     # public pages
    (app)/                      # signed-in shell
      dashboard/  history/  watchlist/  settings/providers/
      stocks/search/            # search + confirmation
      stocks/[exchange]/[symbol]/  # overview, chart, fundamentals, Analyze
      analysis/[id]/            # analysis record (debate arrives Phase 3–4)
    api/
      stocks/{search,quote,history,profile,fundamentals}/route.js
      market/status/  providers/  watchlist/  analyses/  user/settings/  health/
    auth/{callback,signout}/route.js
  components/                   # UI primitives, chart, provenance, nav
  lib/
    market-data/                # service, providers/, provenance, status, cache, http
    auth/  supabase/            # identity
    db/                         # Prisma client + user-scoped repositories
    security/                   # encryption, rate limit, redaction
    validation/schemas.js       # Zod schemas
    api/handler.js              # error envelope, JSON parsing, same-origin
tests/
  unit/                         # no network, no DB
  db/                           # needs TEST_DATABASE_URL
  fixtures/  helpers/
```

## Local installation

Requirements: Node.js ≥ 20.9, PostgreSQL 14+ (local or Supabase).

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env.local       # fill in values
npx prisma migrate deploy        # create tables (uses DIRECT_URL or DATABASE_URL)
npm run dev                      # http://localhost:3000
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

To try the app without Supabase on your own machine, set `AUTH_MODE="dev-local"` in `.env.local`. You will be signed in as a shared local user. This mode is disabled automatically on Vercel.

To try the app without a market-data key, use the offline mock (fake data):

```bash
node scripts/mock-market-server.mjs &
TWELVE_DATA_API_KEY=mock TWELVE_DATA_BASE_URL=http://localhost:4010 npm run dev
```

## Tests

```bash
npm test                         # unit + DB projects; DB tests skip without TEST_DATABASE_URL
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/tribunal_test" npm test
```

Use a **disposable** test database that has the migration applied. Tests never call paid APIs.

## Supabase setup

1. Create a project at supabase.com.
2. **Project Settings → API**: copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`, and the anon (or publishable) key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put the `service_role` key in this app.
3. **Connect → ORMs / connection strings**:
   - `DATABASE_URL` = **Transaction pooler** (port 6543), with `?pgbouncer=true` appended.
   - `DIRECT_URL` = **Session pooler** or direct connection (port 5432). Migrations use this.
   - If you see "prepared statement already exists" errors at runtime, set `DATABASE_URL` to the session pooler URL as well.
4. Run `npx prisma migrate deploy` from your machine with these variables set.
5. **Authentication → URL Configuration**: set Site URL to your deployed URL, and add `https://YOUR-DOMAIN/auth/callback` (plus `http://localhost:3000/auth/callback` for development) to Redirect URLs.
6. **Authentication → Providers → Email**: keep "Confirm email" on for production.

## Deployment (Vercel)

1. Push the repository to GitHub (`.env*` files are git-ignored; `.env.example` is committed).
2. In Vercel, import the repo. Framework: Next.js. The build command `npm run build` runs `prisma generate && next build`.
3. Add environment variables (Production and Preview): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ENCRYPTION_KEY`, and optionally `TWELVE_DATA_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `MARKET_DATA_PROVIDER`, `MARKET_DATA_REALTIME_EXCHANGES`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LOG_LEVEL`.
4. Apply migrations before or after the first deploy with `npx prisma migrate deploy` (from your machine or a CI step using `DIRECT_URL`).
5. Deploy. Vercel provides HTTPS. Check `https://YOUR-DOMAIN/api/health`, which should return `"status":"ok"` and `"auth":"supabase"`.
6. **Monitoring**: logs are JSON lines in Vercel → Logs (searchable by `msg`, `route`, `requestId`). Every API response carries `x-request-id`. Add a Vercel log drain or Sentry for alerting, and point an uptime monitor at `/api/health`.

**Keep `ENCRYPTION_KEY` stable.** If it changes, stored user keys can no longer be decrypted and users must re-enter them.

Long-running debates (Phase 4) will use a database-backed job queue with a background worker, not a single serverless request.

## API key configuration

- **Per user**: Dashboard → API providers. Keys are encrypted server-side and are never returned to the browser.
- **Server-wide** (optional): environment variables. A user's own key takes precedence over the server key.
- **Market data selection**: the user's preferred provider (if they have its key), then Twelve Data, then Alpha Vantage, then server keys in `MARKET_DATA_PROVIDER` order. The app never switches provider silently when a call fails, and each figure names its source.
- Set spending and usage limits in each provider's dashboard (Anthropic Console, OpenAI usage limits, Twelve Data plan).

### First-run verification with real keys

1. Add a Twelve Data key in Settings.
2. Search "Infosys" with exchange NSE → confirm → the overview should show a price with source "Twelve Data" and an as-of date.
3. Click **Load fundamentals**. Free plans usually list some sections as unavailable; this is expected and shown in the UI.
4. Search "Apple" → confirm the NASDAQ listing → check the price and chart.
5. Check Vercel logs for any `PROVIDER_BAD_RESPONSE` errors, which indicate a field-mapping mismatch to fix.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Authentication is not configured" | Supabase env vars missing. On a laptop, use `AUTH_MODE=dev-local`. |
| "Market data provider not configured" | Add a key in Settings or set `TWELVE_DATA_API_KEY`. |
| "Server encryption key missing" | Set `ENCRYPTION_KEY` (32 bytes, base64). |
| "Stored credential could not be decrypted" | `ENCRYPTION_KEY` changed. Re-enter the API keys. |
| "Provider rate limit reached" | Free tiers allow few requests per minute or day. Wait, or upgrade the plan. |
| "Not included in your data plan" | That endpoint needs a paid tier with the provider. |
| "Exchange not supported" with Alpha Vantage on NSE | Alpha Vantage doesn't cover NSE. Use Twelve Data or the BSE listing. |
| `/api/health` shows `database: unreachable` | Check `DATABASE_URL`, Supabase pooler host and password, and that IPv4 pooler URLs are used on Vercel. |
| Redirect loop after login | Supabase Site URL / Redirect URLs don't match your domain. |
| `prisma generate` fails in CI | Ensure `npm install` runs (postinstall) and `prisma` and `@prisma/client` are the same version. |

## Regulatory note

Before any public or commercial release, review market-data licensing (display and redistribution rights), privacy law, and securities regulation in every target jurisdiction. In India, this includes SEBI rules on research analysts and investment advisers.
