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

---

## Store settings — how to add a new global configuration parameter

Store-level settings are stored as a **JSONB column** (`stores.settings`) so new parameters can be added without migrations.

### Architecture

```
packages/shared/src/types/store.ts   → StoreSettings interface (TypeScript contract)
Supabase stores.settings column      → JSONB persistence (no migration needed for new keys)
apps/backend/src/routes/stores.ts    → PUT /stores/settings (admin-only, merge strategy)
apps/frontend/src/store/slices/storeSlice.ts → updateStoreSettings thunk (persists + updates Redux)
```

### Adding a new setting — step by step

**1. Add the key to `StoreSettings`** in `packages/shared/src/types/store.ts`:
```ts
export interface StoreSettings {
  hasVariants: boolean
  hasLoyalty: boolean
  myNewSetting: boolean  // ← add here
  someStringSetting: string
}
```

**2. Wire the toggle UI** in `apps/frontend/src/app/(dashboard)/settings/page.tsx` (Store tab):
```tsx
<label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
  <input
    type="checkbox"
    checked={settings?.myNewSetting ?? false}
    onChange={(e) => dispatch(updateStoreSettings({ myNewSetting: e.target.checked }))}
    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
  />
  <div>
    <span className="block text-sm font-bold text-on-surface">My New Setting</span>
    <span className="block text-xs text-on-surface-variant mt-0.5">Description of what it does</span>
  </div>
</label>
```

**3. Read the setting** wherever it's needed (e.g. in a component):
```tsx
const settings = useAppSelector((state) => state.storeConfig.currentStore?.settings)
const mySetting = settings?.myNewSetting ?? false  // safe default
```

**No migration needed** — the JSONB column accepts any keys. No backend changes either — `PUT /stores/settings` already does a deep merge (`{ ...current, ...incoming }`).

### Data flow

```
User toggles checkbox
  → dispatch(updateStoreSettings({ myNewSetting: true }))
  → fetch PUT /api/stores/settings  (proxied to backend)
  → backend reads current settings, merges, writes JSONB
  → returns { settings: { ...merged } }
  → fulfilled reducer updates state.storeConfig.currentStore.settings
  → all selectors re-render
```

Settings are loaded automatically on app start via `fetchStore()` dispatched from `SessionSyncProvider` in `provider.tsx`.

### Critical: migrations for column-backed settings

If a new setting needs a **dedicated DB column** (not JSONB), you **must**:

1. Create the migration SQL and apply it immediately with `supabase_apply_migration`
2. Verify with `supabase_execute_sql` → `SELECT column_name FROM information_schema.columns WHERE table_name = 'stores'`
3. Add the column to the `Store` type in `packages/shared/src/types/store.ts`
4. Update the `PUT /stores/settings` handler in `apps/backend/src/routes/stores.ts` to extract the value from the request body and update the column (same pattern as `tax_rate`)

**Do not write backend code referencing a column that hasn't been migrated.** Always apply the migration before writing code that reads/writes it.

### Files involved

| File | Role |
|---|---|
| `packages/shared/src/types/store.ts` | `StoreSettings` interface — add new keys here |
| `apps/backend/src/routes/stores.ts` | `PUT /stores/settings` — merge + persist (no changes needed for new keys) |
| `apps/frontend/src/store/slices/storeSlice.ts` | `updateStoreSettings` thunk + reducer (no changes needed for new keys) |
| `apps/frontend/src/app/(dashboard)/settings/page.tsx` | Toggle UI in Store tab — add new checkbox here |
| `apps/frontend/src/store/provider.tsx` | `dispatch(fetchStore())` — loads settings on auth (no changes needed) |

---

## Tax configuration — adding new tax-related settings

Tax settings live partly in `stores.settings` (JSONB) and partly in `stores.tax_rate` (separate DB column).

### Special case: `taxRate`

Unlike other settings that live entirely in JSONB, `tax_rate` is a **dedicated DB column** because the backend queries it directly for order processing. The `PUT /stores/settings` endpoint auto-extracts `taxRate` from the JSONB payload and updates the column:

```ts
// apps/backend/src/routes/stores.ts (inside PUT /stores/settings)
const settings = { ...currentSettings, ...incomingSettings }
if (incomingSettings?.taxRate !== undefined) {
  await supabase.from('stores').update({ settings, tax_rate: incomingSettings.taxRate }).eq('id', storeId)
} else {
  await supabase.from('stores').update({ settings }).eq('id', storeId)
}
```

When reading, merge both sources in the Redux reducer:

```ts
// storeSlice.ts fulfilled reducer
state.currentStore = {
  ...data,
  settings: { ...data.settings, taxRate: data.tax_rate },
}
```

**This is the only setting that needs this treatment.** All others live entirely in JSONB.

### Current tax settings in `StoreSettings`

Defined in `packages/shared/src/types/store.ts`:

```ts
export interface StoreSettings {
  // Product defaults
  hasVariants: boolean
  hasLoyalty: boolean
  // Tax configuration
  taxEnabled: boolean       // master toggle — when off, no tax is calculated
  taxLabel: string          // display label (e.g. "VAT", "Sales Tax", "IVA")
  taxInclusive: boolean     // true = prices already include tax (extract it)
  taxExemptEnabled: boolean // true = show per-product "Tax Exempt" checkbox
  taxRate?: number          // note: stored in DB column, mapped here for Redux convenience
}
```

### Frontend consumption pattern

Components read tax settings from Redux store:

```ts
const store = useAppSelector((s) => s.storeConfig.currentStore)
const settings = store?.settings
const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
const taxLabel = settings?.taxLabel || 'Tax'
const taxInclusive = settings?.taxInclusive ?? false
const taxEnabled = settings?.taxEnabled ?? false
const taxExemptEnabled = settings?.taxExemptEnabled ?? false
```

Then pass them as props to `OrderSummary`:

```tsx
<OrderSummary
  subtotal={total}
  discount={discount}
  discountLabel={discountLabel}
  taxRate={taxRate}
  taxLabel={taxLabel}
  taxInclusive={taxInclusive}
  showTotal
/>
```

### OrderSummary props

| Prop | Type | Default | Description |
|---|---|---|---|
| `subtotal` | `number` | required | Sum of all line item prices |
| `discount` | `number` | required | Discount amount |
| `discountLabel` | `string` | `'Discount'` | Discount line label |
| `tax` | `number` | optional | Tax override (if not provided, calculated from taxRate) |
| `taxRate` | `number` | `0.08` | Tax rate as decimal (e.g. 0.08 for 8%) |
| `taxLabel` | `string` | `'Tax'` | Tax line label |
| `taxInclusive` | `boolean` | `false` | If true, tax is extracted from subtotal, not added on top |
| `showTotal` | `boolean` | `false` | Show total line (used only in CheckoutPanel) |

### Per-product tax exemption

When `taxExemptEnabled` is true, ProductForm shows a "Tax Exempt" checkbox:

```tsx
{settings?.taxExemptEnabled && (
  <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={form.tax_exempt} onChange={...} />
      <div>
        <span className="block text-sm font-bold text-on-surface">Tax Exempt</span>
        <span className="block text-xs text-on-surface-variant mt-0.5">Not subject to sales tax</span>
      </div>
    </label>
  </div>
)}
```

The `tax_exempt` field is included in:
- `Product` interface (`packages/shared/src/types/product.ts`)
- `productSchema` Zod validation (`packages/shared/src/validations.ts`)
- `EditProductPage` `initialData` (`apps/frontend/src/app/(dashboard)/products/[id]/edit/page.tsx`)

### Backend tax calculation

In `apps/backend/src/routes/orders.ts` (`POST /orders`):

```ts
// Read store settings
const storeData = await supabase.from('stores').select('settings, tax_rate').eq('id', storeId).single()
const settings = storeData.settings || {}
const taxRate = settings.taxEnabled ? (storeData.tax_rate || 0) / 100 : 0

// Calculate taxable subtotal (excluding tax-exempt products when feature is on)
const taxableSubtotal = settings.taxExemptEnabled
  ? items.filter(i => !i.tax_exempt).reduce(...)
  : subtotal

// Tax calculation
let tax = 0
if (settings.taxInclusive) {
  tax = taxableSubtotal - (taxableSubtotal / (1 + taxRate))
} else {
  tax = taxableSubtotal * taxRate
}

// Total
const total = settings.taxInclusive
  ? subtotal - discount
  : subtotal + tax - discount
```

### Adding a new tax-related parameter (same as any other setting)

Follow the same steps in the "Store settings" section above. Special cases (like `taxRate` requiring a DB column) are rare — most parameters go entirely into JSONB.

---

- Base components live in `apps/frontend/src/components/ui/` — `Modal`, `Button`, `Input`, `Select`, `Table`, `Card`, `Tabs`
- `ui/Modal` exports: `Modal`, `ModalTrigger`, `ModalClose`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalFooter` (Radix Dialog primitives)
- `ui/Input` supports `label`, `error` props; handles `aria-invalid` and `aria-describedby` automatically
- Use `ui/Button` with `isLoading` prop for async actions — shows spinner and disables automatically
- Domain-specific components (products, pos, layout) live in their own subdirectory under `src/components/`
