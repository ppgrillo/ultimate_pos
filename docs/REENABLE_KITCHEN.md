# How to Reactivate Kitchen / Food Service Mode

> **Estado actual:** La función Kitchen está **planeada para desactivarse en UI**, no se
> ha borrado nada. Todo el código (componentes, rutas, lógica de backend) sigue intacto —
> se activa/desactiva automáticamente según `stores.settings.hasKitchen`.
>
> **Estado de la DB:** todas las tiendas activas ya tienen `hasKitchen: false` (o la key
> ausente), así que la app **ya corre en modo retail hoy**. Lo que falta es el cambio de
> código para ocultar el toggle de Settings (ver sección 1).
>
> **Estado del código:** aplicado — el toggle "Has Kitchen / Food Service" ya se eliminó
> de `settings/page.tsx` y el default del recibo pasó a `?? false`. Pasos para revertirlo
> en la sección 3.

---

## 1. Contexto

La decisión es mostrar solo el POS retail normal. La desactivación es **UI-only** — no
borra componentes ni lógica, solo la oculta detrás de la flag.

| Archivo | Cambio planificado al desactivar |
|---|---|
| `apps/frontend/src/app/(dashboard)/settings/page.tsx` | Eliminar el toggle "Has Kitchen / Food Service", la tarjeta "Kitchen Workflow", el estado `hasKitchen`/`kitchenWorkflow`, su entrada en `hasChanges`, su key en el payload de `handleSave`, y quitar el gate `{!hasKitchen && ...}` del card "Checkout Mode" |
| `apps/frontend/src/app/(dashboard)/pos/receipt/page.tsx` | Default `?? true` → `?? false` (evita copy "sent to the kitchen" cuando la key falta) |

**No se toca:** backend, rutas `/pos-kitchen` y `/orders/kitchen`, componentes
(`TablesWorkspace`, `KitchenOrderActions`), tipos compartidos (`KitchenWorkflowConfig`),
ni la lógica de transiciones. Nada de eso se migra ni se borra.

**No se corrió ninguna migración de schema** — `hasKitchen` vive en el JSONB
`stores.settings`, no requiere columnas nuevas.

---

## 2. Rápida — reactivar solo con el flag (sin tocar código)

La UI kitchen está 100% gateada por `settings.hasKitchen`. Con activar la flag, casi
todo reaparece.

**Opción A — desde la DB (Supabase SQL):**

```sql
-- Una tienda
UPDATE stores
SET settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{hasKitchen}', 'true')
WHERE id = 'TU_STORE_ID';

-- Todas las tiendas
UPDATE stores
SET settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{hasKitchen}', 'true');
```

**Opción B — API:** `PUT /api/stores/settings` con body
`{ "settings": { "hasKitchen": true } }` (el backend hace merge profundo — ver
`apps/backend/src/routes/stores.ts`).

### Qué reaparece automáticamente al activar la flag

- **Sidebar / MobileDrawer / BottomNav**: link "Point of Sale" → `/pos-kitchen`,
  "Kitchen Orders" → `/orders/kitchen`
- **POS** (`/pos`): visión de Mesas (`TablesWorkspace`), selector
  Dine-in/Takeaway/Delivery, input de Table Number, `ActiveTableBar`, botones
  "Select Table" / "Add to Table"
- **Orders**: redirect a `/orders/kitchen` (board con timeline + `KitchenOrderActions`),
  tabs Active, statuses `preparing`/`ready`/`served`
- **Checkout**: flujo "Add to Table" sin cobro inline, tips diferidos al cerrar la mesa,
  recibo con copy "sent to the kitchen"
- **Backend**: `initialStatus` de órdenes pasa a `pending` (en vez de `paid` para cash),
  `canTransition` usa el workflow de cocina

### Limitación de esta vía rápida

- **No existe el toggle en Settings** para apagarlo ni para editar el "Kitchen Workflow"
  (rename de steps). Para eso va la Ruta completa (sección 3).
- El `kitchenWorkflow` en la DB puede seguir guardado de antes; si no existe, el backend
  aplica `DEFAULT_KITCHEN_WORKFLOW` (`pending → preparing → ready → served → paid`).

---

## 3. Completa — restaurar el toggle en Settings

Aplicar (o revertir) los cambios de la tabla de la sección 1 en `settings/page.tsx`:

1. **Imports** (líneas ~9, 19-25): restaurar `CookingPot` de lucide-react,
   `KitchenWorkflowConfig`, `KitchenWorkflowStepStatus`, `resolveKitchenWorkflow`,
   y los helpers `isStepRequired` / `isOptionalKitchenStep`
2. **Estado** (~líneas 42, 44): `useState(true)` para `hasKitchen` y
   `useState<KitchenWorkflowConfig>(resolveKitchenWorkflow())` para `kitchenWorkflow`
3. **Hidratación** (~líneas 134-136): `setHasKitchen(settings?.hasKitchen ?? true)` y
   `setKitchenWorkflow(resolveKitchenWorkflow(settings?.kitchenWorkflow))`
4. **`hasChanges`** (~líneas 202, 204): volver a incluir las dos comparaciones
5. **`handleSave`** (~líneas 278-280, 333): volver a enviar `hasKitchen` y
   `kitchenWorkflow` en el payload + normalizar con `resolveKitchenWorkflow`
6. **JSX** (~líneas 575-640): restaurar el `<label>` del toggle y la tarjeta
   "Kitchen Workflow" debajo
7. **`Checkout Mode`** (~línea 841): volver a envolver con `{!hasKitchen && (...)}` si
   quieres que solo exista en modo retail *(opcional — dejarlo siempre visible también
   es válido)*
8. **Receipt** (`pos/receipt/page.tsx:38`): `?? false` → `?? true` si quieres el copy
   de cocina cuando la key falte *(opcional)*

**Backend: cero cambios.** `PUT /stores/settings` ya acepta `hasKitchen` y
`kitchenWorkflow`; `POST /orders` y `PATCH /orders/:id/status` ya leen la flag.

---

## 4. Verificación

```sh
npm run lint && npm run typecheck && npm run test
```

Checklist manual con la flag en `true`:

- [ ] Sidebar muestra "Point of Sale" → `/pos-kitchen` y "Kitchen Orders"
- [ ] `/pos` muestra tab de mesas + selector Dine-in + Table Number
- [ ] Enviar una orden dine-in la deja en `pending` y aparece en `/orders/kitchen`
- [ ] Flujo de transiciones: pending → preparing → ready → served → paid
- [ ] Recibo muestra "Your order has been sent to the kitchen"
- [ ] Con la flag en `false`: todo lo anterior desaparece y el POS cobra normal
- [ ] Settings → tab Checkout muestra la tarjeta "Checkout Mode"

---

## 5. Qué pasa si desactivamos `hasKitchen`

Efecto completo de tener la flag en `false` (el estado previsto):

### Se oculta / se reemplaza

| Superficie | Con kitchen ON | Con kitchen OFF |
|---|---|---|
| Sidebar / nav móvil | "Point of Sale" → `/pos-kitchen`, "Kitchen Orders" | "Point of Sale" → `/pos`, "Sales Orders" → `/orders/sales` |
| `/orders` | Board de cocina con tarjetas + timeline en tiempo real | Lista tabular de ventas (tabs Unpaid/Completed, sorting y paginación) |
| Checkout POS | "Add to Table" sin cobro; tips al cerrar la mesa | Cobro inline normal (cash/card/transfer), tips inline |
| Selector de dining | Dine-in/Takeaway/Delivery + Table Number visible | Oculto (todo pasa como tipo `dine-in` silencioso — ver gotchas) |
| Estados de orden | `pending → preparing → ready → served → paid` | `pending → paid` (retail: cash marca `paid` directo) |
| Recibo | "Your order has been sent to la kitchen" | "Payment confirmed." |
| Tarjeta "Checkout Mode" en Settings | Oculta (asumida cocina) | Visible — `order-only` / `payment-required` / `order-first-pay-later` |

### Se vuelve inalcanzable desde la UI (pero existe)

- Rutas `/pos-kitchen` y `/orders/kitchen` (accesibles solo escribiendo la URL
  directamente — no hay redirect)
- `TablesWorkspace`, `KitchenOrderActions`, editor de Kitchen Workflow
- Transiciones de cocina y validación "Cannot close check while kitchen tickets active"

### Nada se borra

Cero migraciones, cero deletes. El modo se revierte en segundos con la sección 2.

---

## 6. Gotchas conocidos

- **`order_type` default `dine-in`**: el carrito siempre inicia en `dine-in`
  (`cartSlice.ts`). Sin kitchen el toggle está oculto, así que las órdenes se guardan
  como `dine-in` aunque sea retail. Es cosmético (afecta solo etiquetas en analytics).
  *Decisión: no tocar.*
- **URLs kitchen siguen accesibles** escribiendo `/pos-kitchen` o `/orders/kitchen`
  directamente (solo ocultas del nav, no hay redirect). *Decisión: no redirigir.*
- **`hasKitchen` vive en JSONB** (`stores.settings`) — no requiere migración de schema.
- No confundir con `checkoutMode`: son independientes. Kitchen es un "modo" de flujo;
  checkoutMode controla si el pago es obligatorio.
- **Si el toggle se elimina pero el payload sigue enviando `hasKitchen`**, al guardar
  settings se escribe el default `true` y la cocina "revive sola". Al quitar el toggle,
  quitarlo también del payload y de `hasChanges`.
