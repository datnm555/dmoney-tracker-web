# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React frontend of dmoney-tracker (personal money tracker, Vietnamese-first). Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Radix-based, vendored in `src/components/ui/`) + Recharts + sonner toasts. Theme (primary `#6C4CF1`, zinc neutrals, income/expense colors, Be Vietnam Pro) lives in `src/index.css`; add new shadcn components with `npx shadcn@latest add -y <name>`. Sibling repos: `../dmoney-tracker-be` (the .NET API this app calls) and `../dmoney-tracker-orchestrator` (full-stack docker compose). ALL user-facing strings come from the backend's `GET /resources` endpoint — there are no translation files in this repo.

## Commands

```bash
npm run dev     # http://localhost:5173 (expects API at VITE_API_URL, default http://localhost:5113)
npm test        # vitest run (jsdom)
npm test -- src/utils/chartData.test.ts   # single file
npm run build   # tsc -b && vite build — tsc type-checks test files too
```

The backend must be running for the app to work (`dotnet run --project src/Web.Api` in the be repo, plus postgres).

## Architecture

- `src/api/client.ts` — axios instance; request interceptor attaches `Bearer` token + `lang` param to every call; response interceptor clears storage and redirects to `/login` on 401 (outside the login page). `getApiErrorMessage` reads `description ?? detail` from BE error bodies. `STORAGE_KEYS` (`dmoney.token`/`dmoney.user`/`dmoney.lang`) are load-bearing.
- `src/i18n/I18nContext.tsx` — fetches `/resources` on load and on language switch; gates rendering on `ready` (spinner). `t(key)` falls back silently to the raw key, so a missing resx key will NOT fail any test — when adding a UI string, add its key to BOTH `SharedResource.{vi,en}.resx` in the be repo.
- `src/auth/AuthContext.tsx` + `ProtectedRoute` — JWT in localStorage; routes: `/login`, `/register` public; `/app/dashboard` (Tổng quan) and `/app/transactions` (Giao dịch) guarded; `/app/summary` redirects to `/app/transactions`.
- `src/utils/categories.ts` `CATEGORY_CODES` must stay in sync with `Domain/Transactions/TransactionCategories.cs` in the be repo (comment-synced, no shared source). Same for `src/utils/paymentMethods.ts` ↔ `PaymentMethods.cs` + `CardTypes.cs`.
- Chart data transforms are pure functions in `src/utils/chartData.ts` (unit-tested); `DashboardPage` only wires them into Recharts components. Day grouping for the transactions list lives in `src/utils/transactionGroups.ts`.
- TS types in `src/api/types.ts` mirror the backend response DTOs (camelCased by ASP.NET); update both sides together.

## Testing conventions

Vitest + Testing Library (jsdom). Tests mock `../api/resourceApi` so `t()` returns raw keys, and assert on those keys (e.g. `'form.amountRequired'`). `src/test/setup.ts` stubs `window.ResizeObserver` (Radix needs it in jsdom) and `window.matchMedia`. Use `findBy*` for the first query in any component rendered under `I18nProvider` — rendering is gated on the async `ready` flag.
