# Portfolio Tracker

A premium personal wealth and investment portfolio tracker designed for private use with a Supabase-backed data layer, local demo mode, and a polished dashboard UX.

## Features
- Dashboard with market value, invested capital, P&L, milestones, and allocation charts
- Holdings management with search and category grouping
- Transaction ledger and accounting assumptions
- CSV/Excel import workflow with validation and preview
- Six default wealth milestones seeded into the app
- Asset allocation targets and progress views
- Supabase email/password authentication and user-isolated portfolio storage
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
The dashboard checks Yahoo Finance chart quotes for `^NSEI` (NIFTY 50), `^BSESN` (Sensex), and `^NSEBANK` (NIFTY Bank) every 60 seconds through the Vite development proxy. The free feed returned HTTP 429 (rate limited) during verification, so one-second fetching is not reliable or appropriate for this provider. Quotes are indicative, may be delayed, and are not an exchange-authorized real-time feed. Production hosting requires a server-side proxy/provider because the Vite proxy is development-only.

## Scripts
- `npm run dev` – local development
- `npm run build` – production build
- `npm run test:run` – unit tests
- `npm run typecheck` – TypeScript validation

## Notes
With Supabase configured, authenticated changes sync to the user's Supabase account. Without credentials, the app remains in clearly labeled browser-only demo mode.
