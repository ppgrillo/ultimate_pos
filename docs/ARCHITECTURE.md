# Ultimate POS — Architecture

## Overview

Monorepo with two apps (frontend + backend) and a shared package.

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                   │
│  src/app/pages   →   lib/api/client   →   fetch(/api/*)  │
│  components/ui/  ←   Tailwind + Radix + DESIGN.md        │
│  store/slices/   ←   Redux Toolkit                       │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP (proxy via next.config.ts)
                        ▼
┌──────────────────────────────────────────────────────────┐
│                    Backend (Hono)                         │
│  middleware/auth.ts  →  JWT verification                  │
│  routes/*           →  Zod validation → Supabase client  │
│  lib/supabase/      →  ONLY place that touches database  │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                 │
│  RLS policies enforce per-user permissions                │
│  Tables: stores, products, orders, customers, loyalty...  │
└──────────────────────────────────────────────────────────┘
```

## Key decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo** | Single repo, shared types, coordinated deploys |
| **Frontend + Backend** | Security — Supabase keys never reach client |
| **Hono** | Fast, TS-native, lightweight API framework |
| **Next.js proxy** | Dev: `/api/*` → backend. Prod: same pattern or separate domain |
| **Radix UI + CVA** | Accessible primitives + variant system for component library |
| **Vitest** | Fast, native ESM, great DX with React Testing Library |

## Auth flow

1. User logs in via NextAuth (Google OAuth or credentials)
2. Frontend receives JWT session token
3. Frontend sends JWT as `Authorization: Bearer <token>` to backend
4. Backend `middleware/auth.ts` verifies JWT with `jose`
5. Backend creates Supabase client scoped to the authenticated user
6. Supabase RLS policies enforce row-level security

## Component library pattern

Each UI component follows the same structure:

```
components/ui/Component/
├── Component.tsx     # Implementation (Radix + CVA + Tailwind)
├── Component.test.tsx # Vitest + RTL tests
└── index.ts          # Public exports
```

## Development

```bash
# Start everything
npm run dev

# Frontend only (port 3000)
npm run dev -w @ultimate-pos/frontend

# Backend only (port 3001)
npm run dev -w @ultimate-pos/backend

# Tests
npm run test -w @ultimate-pos/frontend
```

## Environment variables

See `.env.example` in each app. Required vars:

### Frontend
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:3001`)
- `NEXTAUTH_SECRET` — NextAuth encryption key
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials

### Backend
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Anon key (for user-scoped clients)
- `SUPABASE_SERVICE_ROLE_KEY` — Admin key (for invites, signups)
- `NEXTAUTH_SECRET` — Must match frontend (for JWT verification)
