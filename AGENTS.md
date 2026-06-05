# Ultimate POS — Agent Guide

## Stack decisions

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS + Radix UI primitives |
| State mgmt | Redux Toolkit |
| Testing | Vitest + React Testing Library |
| Database | Supabase (PostgreSQL) — server-side only |
| Auth | NextAuth.js + Google Provider + Supabase Auth |
| Wallet | Google Wallet API + Apple PassKit |
| UI prototyping | Google Stitch (via MCP) |
| Icons | lucide-react + react-icons (no inline SVGs) |

## Architecture rules

- **Monorepo** with npm workspaces: `apps/frontend`, `apps/backend`, `packages/shared`
- **Frontend NEVER calls Supabase directly.** All DB access goes through the backend API (`apps/backend`).
- **Frontend proxies to backend** via `middleware.ts` — `/api/*` → `localhost:3001`, except `/api/auth/*` and `/api/register` which have their own route handlers
- **Component library** lives in `apps/frontend/src/components/ui/`. Each component in its own folder: `Button/Button.tsx`, `Button/Button.test.tsx`, `Button/index.ts`.
- **Redux Toolkit** store in `apps/frontend/src/store/` with slices per domain (auth, cart/pos, store).
- **Backend** uses **Hono** framework with JWT auth middleware.
- **Roles:** `admin` (store owner) and `employee` (waiter/staff). Admin invites employees via email/link.

## Commands

```sh
npm run dev              # Turbo: runs frontend + backend concurrently
npm run test             # Vitest across all packages
npm run test:watch       # Vitest watch mode
npm run lint             # ESLint / tsc checks
npm run typecheck        # tsc --noEmit

# Individual apps:
npm run dev -w @ultimate-pos/frontend   # Frontend only (port 3000)
npm run dev -w @ultimate-pos/backend    # Backend only (port 3001)
npm run test -w @ultimate-pos/frontend  # Frontend tests only
```

Expected order: `lint -> typecheck -> test` before committing.

## Project structure

```
ultimate-pos/
├── apps/
│   ├── frontend/             Next.js 14+ (App Router)
│   │   ├── src/app/          Pages + API auth route
│   │   ├── src/components/ui/ Base component library
│   │   ├── src/store/slices/ Redux Toolkit
│   │   └── src/lib/api/      HTTP client → backend
│   └── backend/              Hono API server
│       ├── src/routes/       products, orders, auth, employees, customers
│       ├── src/middleware/    JWT verify, RBAC, error handler
│       └── src/lib/supabase/ Supabase clients (server-only)
├── packages/
│   └── shared/               Shared types + Zod schemas
├── AGENTS.md
├── DESIGN.md                 Design system tokens from Stitch
└── docs/ARCHITECTURE.md
```

## Design system

All tokens (colors, typography, spacing, border radius) are defined in:
- `DESIGN.md` — source of truth
- `apps/frontend/tailwind.config.ts` — Tailwind implementation
- `apps/frontend/src/app/globals.css` — utility classes (.glass, .glow-*)

Theme: **Vibrant Neo-Bento** — dark mode, Electric Lime (#ccff00) primary, glassmorphism.

## Database tables (planned)

`profiles`, `stores`, `store_members`, `products`, `categories`, `orders`, `order_items`, `customers`, `loyalty_cards`, `payments`

## MCP integrations

Supabase (DB + Auth) and Google Stitch (UI design) are configured in `opencode.json`.
