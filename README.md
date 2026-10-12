# Portfolio Tracker

A premium personal wealth and investment portfolio tracker designed for private use with a Supabase-backed data layer, local demo mode, and a polished dashboard UX.

## Features
- Dashboard with market value, invested capital, P&L, milestones, and allocation charts
- Holdings management with search and category grouping
- Transaction ledger and accounting assumptions
- CSV/Excel import workflow with validation and preview
- Eight default wealth milestones seeded into the app
- Asset allocation targets and progress views
- Supabase email/password authentication and user-isolated portfolio storage
- Fundamental stock screener for Screener.in CSV exports
- Dashboard quotes for NIFTY 50, Sensex, and NIFTY Bank
- Local demo mode when Supabase credentials are not configured

## Quick start
1. Install dependencies:
   npm install
2. Create `.env.local` from `.env.example` and add your Supabase project URL and publishable key.
3. Start the app:
   npm run dev

## Environment configuration
Create a `.env.local` file with the following values:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

For older Supabase projects, `VITE_SUPABASE_ANON_KEY` is also accepted. Never put the `service_role` key in frontend environment variables. `.env.local` is git-ignored.

## Supabase setup
1. Create a Supabase project and copy its Project URL and publishable key from **Project Settings → API Keys**.
2. For a new project, run migrations `001_init.sql`, `002_portfolio_fields.sql`, and `003_authenticated_table_grants.sql` in order in the Supabase SQL Editor.
3. Enable email/password under **Authentication → Providers → Email**. Set your local or deployed app URL under **Authentication → URL Configuration**.
4. Start the app, select **Create an account**, and register with an email and password. If email confirmation is enabled, confirm the email before signing in.
5. Sign in. The app initializes the per-user categories, milestones, and allocation targets. Holdings, transactions, snapshots, milestones, profile name, and allocation targets are read from and saved to Supabase. Row Level Security policies restrict rows to the signed-in user.

Existing project schemas: if `001_init.sql` was already run, do not run it again because its `CREATE POLICY` statements are not idempotent. Run `002_portfolio_fields.sql` if needed, then run `003_authenticated_table_grants.sql` to grant the authenticated app role table privileges; RLS policies still restrict each user's rows.

When Supabase credentials are absent, the app has a demo sign-in and local browser storage. That mode is not an account and does not sync to Supabase.

## Market index quotes
The dashboard checks Yahoo Finance chart quotes for `^NSEI` (NIFTY 50), `^BSESN` (Sensex), and `^NSEBANK` (NIFTY Bank) every 60 seconds. Local development uses the Vite proxy; Vercel deployments use the `/api/finance` serverless function to proxy those requests to Yahoo Finance. The free feed may return HTTP 429 when rate limited, so quotes can temporarily be unavailable. Quotes are indicative, may be delayed, and are not an exchange-authorized real-time feed.

## Fundamental stock screener
The Screener tab filters Screener.in CSV exports for market capitalization > ₹500 Cr, 3-year sales growth > 12%, 3-year profit growth > 15%, ROCE > 15%, ROE > 15%, P/E < 30, debt/equity < 0.5, interest coverage > 3, and promoter pledge = 0%. Export a CSV from Screener.in with all nine metric columns and upload it in the tab. The app filters the supplied data locally; it does not scrape or authenticate to Screener.in, whose custom screens require a signed-in account. Import dates are shown so users can judge the freshness of the source data.

## Scripts
- `npm run dev` – local development
- `npm run build` – production build
- `npm run test:run` – unit tests
- `npm run typecheck` – TypeScript validation

## Notes
With Supabase configured, authenticated changes sync to the user's Supabase account. Without credentials, the app remains in clearly labeled browser-only demo mode.
