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
- **`apps/frontend/src/lib/api/client.ts` always uses `/api` as base URL** — never `NEXT_PUBLIC_API_URL` directly. `NEXT_PUBLIC_API_URL` is server-side only (used by `middleware.ts` to know where to proxy). Calling the backend directly from the client bypasses the proxy and causes CORS errors.
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
│   │   ├── src/components/products/ Product form + subcomponents
│   │   ├── src/components/pos/       POS screen components
│   │   ├── src/store/slices/ Redux Toolkit
│   │   └── src/lib/api/      HTTP client → backend
│   └── backend/              Hono API server
│       ├── src/routes/       products, orders, auth, employees, customers, categories
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

---

## Auth — how session and role reach the frontend

### The pipeline (critical to understand)

```
Backend /auth/login  ──→  NextAuth JWT callback  ──→  token.role
Backend /auth/me     ──→  NextAuth JWT callback  ──→  token.role
                                   │
                          session callback
                                   │
                          session.user.role        ← available via useSession()
                          session.user.storeId
                          session.user.accessToken
                                   │
                       SessionSyncProvider
                       (apps/frontend/src/store/provider.tsx)
                                   │
                          dispatch(setUser(...))
                                   │
                          state.auth.user.role     ← available via useAppSelector()
```

### Key files

| File | Role |
|---|---|
| `apps/frontend/src/lib/auth.ts` | NextAuth config — JWT + session callbacks that embed `role`, `storeId`, `accessToken` into the token |
| `apps/frontend/src/store/provider.tsx` | `SessionSyncProvider` — runs inside Redux `<Provider>`, bridges NextAuth session → `dispatch(setUser(...))` AND sets the HTTP client token via `setApiToken` |
| `apps/frontend/src/store/slices/authSlice.ts` | Redux slice — `state.auth.user: User \| null`, `state.auth.session: string \| null` |
| `apps/backend/src/routes/auth.ts` | `GET /auth/me` — returns `profile_id`, `store_id`, `role` (used by NextAuth Google login path) |

### Provider tree order (must be maintained)

```tsx
// apps/frontend/src/store/provider.tsx
<SessionProvider>          // NextAuth
  <Provider store={store}> // Redux — must wrap SessionSyncProvider
    <SessionSyncProvider>  // bridges session → Redux + HTTP client
      {children}
    </SessionSyncProvider>
  </Provider>
</SessionProvider>
```

`SessionSyncProvider` **must** be inside `<Provider store={store}>` to use `useDispatch`. Placing it outside (as `ApiTokenProvider` previously was) breaks the Redux bridge — `state.auth.user` stays `null`.

### Reading the role in components

```ts
// Correct — reads from Redux (works after SessionSyncProvider syncs)
const userRole = useAppSelector((state) => state.auth.user?.role)
const isAdmin = userRole === 'admin'

// Also valid if Redux hasn't synced yet (e.g. auth-only pages)
const { data: session } = useSession()
const role = (session?.user as any)?.role
```

### Role-gating UI (pattern to follow)

Admin-only actions must be hidden from employees, not just disabled:

```tsx
{isAdmin && <button onClick={openAdminModal}>...</button>}
```

Backend enforces RBAC independently — the UI gate is a UX convenience only.

---

## Categories

### Backend API (`apps/backend/src/routes/categories.ts`)

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| `GET` | `/categories` | JWT | any | Lists all categories for the store, ordered by `sort_order` |
| `GET` | `/categories/:id` | JWT | any | Single category |
| `POST` | `/categories` | JWT | **admin** | Create — body: `{ name, description?, sort_order? }` |
| `PUT` | `/categories/:id` | JWT | **admin** | Update |
| `DELETE` | `/categories/:id` | JWT | **admin** | Delete |

Response envelope: `{ data: [...] }` for lists, `{ data: {...} }` for single.

### Frontend components

There are **two separate `CategoryChips` components** with different UX — do not consolidate without intention:

| Component | Path | Behavior |
|---|---|---|
| Products version | `apps/frontend/src/components/products/CategoryChips/` | No "All" button. Has optional `onAdd` prop — when provided (admin only), renders a `+ New` dashed pill. |
| POS version | `apps/frontend/src/components/pos/CategoryChips/` | Has an "All Items" first button for menu filtering. No `onAdd`. |

### Inline category creation (`CreateCategoryModal`)

`apps/frontend/src/components/products/CreateCategoryModal/`

- Modal (Radix Dialog via `ui/Modal`) with **name** (required) + **description** (optional textarea) fields
- Calls `POST /categories` via `api.post`
- Props: `open`, `onOpenChange`, `onCreated: (category: CreatedCategory) => void`
- Caller is responsible for appending to local state and auto-selecting

Usage pattern in `ProductForm`:
```tsx
const handleCategoryCreated = (cat: CreatedCategory) => {
  setCategories((prev) => [...prev, { id: cat.id, name: cat.name }])
  updateField('category_id', cat.id) // auto-select
}
// Gate to admin only:
<CategoryChips onAdd={isAdmin ? () => setShowCategoryModal(true) : undefined} ... />
<CreateCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} onCreated={handleCategoryCreated} />
```

### Known type gap

`ProductCategory` in `packages/shared/src/types/product.ts` is missing the `description` field that the backend schema and DB table include. There is also no exported `categorySchema` Zod object in `packages/shared` (the backend defines its own inline schema).

---

## Category data fetching — two parallel patterns

| Context | Pattern | Where stored |
|---|---|---|
| `ProductForm` | Ad-hoc `api.get('/categories')` into local `useState` | Local component state |
| POS menu | `dispatch(fetchCategories())` thunk | `state.products.categories` (Redux) |

`ProductForm` intentionally uses local state to avoid Redux coupling for a form context. Do not change this to Redux without a specific reason.

---

## UI component conventions

- Base components live in `apps/frontend/src/components/ui/` — `Modal`, `Button`, `Input`, `Select`, `Table`, `Card`, `Tabs`
- `ui/Modal` exports: `Modal`, `ModalTrigger`, `ModalClose`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalFooter` (Radix Dialog primitives)
- `ui/Input` supports `label`, `error` props; handles `aria-invalid` and `aria-describedby` automatically
- Use `ui/Button` with `isLoading` prop for async actions — shows spinner and disables automatically
- Domain-specific components (products, pos, layout) live in their own subdirectory under `src/components/`
