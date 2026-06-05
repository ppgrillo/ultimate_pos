# Build Phases — Ultimate POS

Legend: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

## Phase 1 — POS Core (Point of Sale)
_Goal: functional menu → cart → checkout flow with mobile-first UI_

| Task | Status |
|------|--------|
| Shared types (order, customer, validation) | ✅ |
| Backend orders route (`employee_id` → `created_by`, auto-calc) | ✅ |
| Redux slices: `productsSlice`, `cartSlice`, `posSlice`, `customersSlice` | ✅ |
| `PosLayout`, `PosHeader`, `PosBottomNav` | ✅ |
| `PosMenu`, `ProductCard`, `CategoryChips`, `PosSearchBar` | ✅ |
| `CustomizeProduct`, `QuantityStepper` | ✅ |
| `PosCart`, `CartItemRow`, `OrderSummary`, `DiningOptionToggle` | ✅ |
| `CheckoutPanel`, `PaymentMethodSelector` | ✅ |
| `CustomerDrawer`, `CustomerQuickPanel`, `QRScanButton` | ✅ |
| `PosDesktopLayout` | ✅ |
| Pages: `pos/page.tsx`, `pos/layout.tsx`, `pos/receipt/page.tsx` | ✅ |
| POS component unit tests | ⬜ |
| `npm run lint && npm run typecheck && npm run test` | ⬜ |

---

## Phase 2 — Inventory & Products
_Goal: full CRUD for products, categories, modifiers, stock tracking_

- Product management page (grid, search, bulk actions)
- Product create/edit form (name, price, description, images)
- Category management (CRUD, reorder)
- Modifier groups editor (single/multi select, price adjustments)
- Stock tracking (quantity on hand, low-stock alerts)
- Barcode/QR code generation per product
- Image upload & gallery (Supabase Storage)
- Product import/export (CSV)

---

## Phase 3 — Orders & Kitchen Display
_Goal: order lifecycle from submission to fulfillment_

- Order list page (filterable by status, date, type)
- Order detail view (items, modifiers, customer info, timeline)
- Kitchen display screen (real-time incoming orders, status updates)
- Order status flow: pending → confirmed → preparing → ready → served → completed
- Order splitting & merging
- Refund / void order flow
- Receipt generation & printing (Bluetooth thermal printer)
- Order notes & special instructions display

---

## Phase 4 — Customers & Loyalty
_Goal: customer profiles, visit history, loyalty program_

- Customer management page (search, filter, list)
- Customer create/edit form (name, email, phone, notes)
- Visit history timeline per customer
- Loyalty tiers (Bronze → Silver → Gold → Platinum)
- Points accumulation & redemption
- Loyalty card issuance (Google Wallet + Apple PassKit)
- Customer-facing purchase history
- Quick customer lookup (search, QR scan, NFC tap)

---

## Phase 5 — Payments & Billing
_Goal: multiple payment methods, split bills, tipping_

- Payment integration (Stripe, Square, or similar)
- Split bill (equal or custom amounts)
- Tipping flow (preset percentages + custom amount)
- Partial payment & deposit tracking
- Payment refund flow
- Cash drawer management (open/close, counting)
- Sales tax configuration (per-location, inclusive/exclusive)
- Discount & promo code engine

---

## Phase 6 — Admin & Multi-Store
_Goal: store management, employee roles, analytics_

- Store settings page (name, address, tax rate, currency)
- Employee management (invite, roles, permissions)
- Shift management (clock in/out, sales per shift)
- Sales dashboard (daily/weekly/monthly charts + export)
- Multiple store locations support
- Role-based access control (admin, manager, cashier, kitchen)
- Audit log (all POS actions tracked)
- System settings: printer config, receipt templates, tax defaults

---

## Stitch Screens Reference

32 screens designed in Stitch covering all phases above. Key screen IDs:

| Screen | Phase |
|--------|-------|
| POS Menu / Cart / Checkout | P1 |
| Product List / Edit | P2 |
| Kitchen Display / Order Detail | P3 |
| Customer Profile / Loyalty | P4 |
| Payment / Split Bill / Tip | P5 |
| Store Settings / Employee Mgmt / Dashboard | P6 |
