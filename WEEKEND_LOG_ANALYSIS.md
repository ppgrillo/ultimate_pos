# Weekend Log Analysis — July 18-19, 2026

Análisis de errores en backend y frontend durante el fin de semana del sábado 18 y domingo 19 de julio.
Generado a partir de logs reales de Docker containers (timezone: Mexico CST / UTC-6).

**Containers analizados:**
- `ovejapos-dev-frontend` (Next.js 14, puerto 3000)
- `ovejapos-dev-backend` (Hono API, puerto 3001)
- `ovejas_automaticas-ovejapass-api-1`
- `ovejas_automaticas-ovejapass-web-1`
- `finbalance-finbalance-1`
- `oefashion-oefashion-1`
- `schedulerapp-scheduler-backend-1`
- `ovejas_automaticas-traefik-1`
- `ovejas_automaticas-n8n-1`
- `ovejas_automaticas-waha-1`

---

## 1. Frontend — Server Actions Not Found (CRÍTICO)

### Log Snapshot (completo, sin truncar)

```
Error: Failed to find Server Action "2e9b6e81c0bb5483a72df3e5f6f855565187f125". This request might be from an older or newer deployment. 
    at r$ (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:17:1667)
    at rE (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:15:6522)
    at no (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:19:1150)
    at /app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:726
    at AsyncLocalStorage.run (node:async_hooks:346:14)
    at Object.wrap (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:13:17831)
    at /app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:616
    at AsyncLocalStorage.run (node:async_hooks:346:14)
    at Object.wrap (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:13:16935)
    at ni (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:543)
Error: Failed to find Server Action "y". This request might be from an older or newer deployment. 
    at r$ (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:17:1667)
    at rE (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:15:6522)
    at no (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:19:1150)
    at /app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:726
    at AsyncLocalStorage.run (node:async_hooks:346:14)
    at Object.wrap (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:13:17831)
    at /app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:616
    at AsyncLocalStorage.run (node:async_hooks:346:14)
    at Object.wrap (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:13:16935)
    at ni (/app/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:20:543)
```

### Archivos Relevantes

| Archivo | Relevancia |
|---------|-----------|
| `apps/ovejaposDEV/apps/frontend/next.config.mjs` | Config de Next.js 14 App Router |
| `apps/ovejaposDEV/apps/frontend/package.json` | Dependencia `next ^14.2.0`, `next-auth ^5.0.0-beta.19` |
| `apps/ovejaposDEV/apps/frontend/src/app/page.tsx` | Root server component con `redirect('/login')` |
| `apps/ovejaposDEV/apps/frontend/src/app/layout.tsx` | Root layout (server component por defecto en App Router) |
| `apps/ovejaposDEV/apps/frontend/src/app/api/auth/[...nextauth]/route.ts` | NextAuth Route Handler |
| `apps/ovejaposDEV/apps/frontend/src/app/api/register/route.ts` | Register Route Handler |
| `apps/ovejaposDEV/apps/frontend/src/middleware.ts` | NextAuth middleware que proxy `/api/*` al backend |
| `apps/ovejaposDEV/apps/frontend/src/lib/auth.ts` | Config de NextAuth |
| `apps/ovejaposDEV/Dockerfile` | Multi-stage: builder -> `frontend-runtime` ejecuta `next start` |
| `apps/ovejaposDEV/docker-compose.yml` | Servicio `frontend` puerto 3000, Traefik `dev.ovejapos.ovejasautomaticas.com` |

### Causa Raíz

El frontend es **Next.js 14 (App Router)** desplegado con `next start`. Aunque **no existen Server Actions explícitos** (`"use server"`) en el código fuente, Next.js internamente registra acciones durante `next build` — los hashes `2e9b6e81c0bb5483a72df3e5f6f855565187f125` y `y` son IDs SHA-1 que Next.js genera para cada Server Action registrada.

El error ocurre cuando el **cliente (browser) tiene cacheado un bundle JavaScript de un build anterior** cuyos Server Action IDs ya no coinciden con el servidor actual. Esto pasa cuando:
1. Se hizo `next build` + `docker-compose up --build` sin limpiar cache del cliente
2. El navegador mantiene cache de JS chunks obsoletos (Service Worker, disk cache, etc.)

**Nota:** La app NO tiene `"use server"` en ningún archivo del código fuente. Las acciones pueden venir de NextAuth v5 beta internamente.

### Qué Arreglar

1. **Inmediato** — Redeploy forzando rebuild limpio:
   ```bash
   cd apps/ovejaposDEV && docker compose build --no-cache frontend && docker compose up -d frontend
   ```
2. **Preventivo** — Agregar `Cache-Control: no-store` a los chunks de Next.js en `next.config.mjs` o en Traefik
3. **Investigar** — Buscar si NextAuth v5 beta genera Server Actions implícitamente (puede que el hash `y` venga de ahí)

---

## 2. Backend — MP Service Polling con `undefined` en Log (BUG DE CÓDIGO)

### Log Snapshot (primeras 10 + últimas 5 de 1,083 líneas)

```
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV4X94WWX4WASVWPJJD2GGD undefined
[mp-service] >> GET /v1/orders/ORD01KXV6HRXPFRMPR8N9HG3W5HD5 undefined
[mp-service] >> GET /v1/orders/ORD01KXV6HRXPFRMPR8N9HG3W5HD5 undefined
[mp-service] >> GET /v1/orders/ORD01KXV6HRXPFRMPR8N9HG3W5HD5 undefined
[mp-service] >> GET /v1/orders/ORD01KXV6HRXPFRMPR8N9HG3W5HD5 undefined
... (1,083 líneas con este patrón durante el weekend) ...
[mp-service] >> GET /v1/orders/ORD01KXYQ1MV3DS05GW997ZYG40SE undefined
[mp-service] >> GET /v1/orders/ORD01KXYQ1MV3DS05GW997ZYG40SE undefined
[mp-service] >> GET /v1/orders/ORD01KXYQ1MV3DS05GW997ZYG40SE undefined
[mp-service] >> GET /v1/orders/ORD01KXYQ1MV3DS05GW997ZYG40SE undefined
[mp-service] >> GET /v1/orders/ORD01KXYQ1MV3DS05GW997ZYG40SE undefined
```

### Respuesta exitosa de MP (ejemplo de referencia)

```
[mp-service] << 200 {"id":"ORD01KXV6HRXPFRMPR8N9HG3W5HD5","type":"point",
  "processing_mode":"automatic",
  "external_reference":"33cb87e1-3c37-466d-a672-e3d0f1edc273",
  "description":"Ultimate POS - 1 items",
  "status":"at_terminal","status_detail":"at_terminal","currency":"MXN",
  "created_date":"2026-07-18T18:06:53.47Z","last_updated_date":"2026-07-18T18:07:09.595Z",
  "config":{"point":{"terminal_id":"NEWLAND_N950__N950NCD100354983","print_on_terminal":"no_ticket"},
  "payment_method":{"default_type":"debit_card"}},
  "transactions":{"payments":[{"id":"PAY01KXV6HRXZTCPVWAXGA5NJTZTZ","amount":"330.00",
  "status":"at_terminal"}]}}
```

### Archivos Relevantes

| Archivo | Línea(s) | Relevancia |
|---------|----------|-----------|
| `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` | **66-67** | **Origen del bug** — `console.log` imprime `bodyStr` que es `undefined` para GETs |
| `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` | **122-127** | Método `getOrder()` que llama `request()` sin body |
| `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` | **50-67** | Método `request()` donde `body` param es `undefined` para GET |
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **112** | Polling en `GET /orders/:id` llama `mpService.getOrder()` |
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **83-221** | Handler completo de polling de órdenes |
| `apps/ovejaposDEV/apps/backend/src/routes/self-checkout.ts` | **486** | Polling en self-checkout llama `mpService.getOrder()` |
| `apps/ovejaposDEV/apps/backend/src/routes/self-checkout.ts` | **464-531** | Handler de self-checkout polling |
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **822** | `clearStuckMpOrders()` también llama `getOrder()` |

### Código fuente del bug

En `mp-point.ts` línea 66-67:
```typescript
const bodyStr = body ? JSON.stringify(body) : undefined
console.log(`[mp-service] >> ${method} ${path}`, bodyStr?.slice(0, 500))
// Para GET requests: body es undefined -> bodyStr es undefined -> log imprime "undefined"
```

En `mp-point.ts` línea 122-127, `getOrder()` no pasa body:
```typescript
async getOrder(accessToken: string, orderId: string): Promise<MPOrderResponse> {
    return this.request<MPOrderResponse>(accessToken, 'GET', `/v1/orders/${orderId}`)
    // request() recibe body=undefined -> bodyStr=undefined -> log imprime "undefined"
}
```

### Causa Raíz

No es un error funcional — todas las respuestas de MercadoPago son **200 OK**. Es un **bug cosmético** en el logging. El `console.log` de la línea 67 imprime `bodyStr` que es `undefined` para peticiones GET (porque GET no tiene body). El output de 1,083 líneas "undefined" hace difícil leer los logs reales.

### Qué Arreglar

En `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` línea 67, cambiar:
```typescript
// ANTES (bug):
console.log(`[mp-service] >> ${method} ${path}`, bodyStr?.slice(0, 500))

// DESPUÉS (fix):
console.log(`[mp-service] >> ${method} ${path}${body ? ' ' + bodyStr?.slice(0, 500) : ''}`)
```

---

## 3. Backend — Pagos Fallidos de MercadoPago (SIN MANEJO EN CÓDIGO)

### Log Snapshot — Pagos con `status_detail` no manejados

```
[mp-service] << 200 {"id":"ORD01KXV6HRXPFRMPR8N9HG3W5HD5","type":"point",
  "processing_mode":"automatic",
  "external_reference":"33cb87e1-3c37-466d-a672-e3d0f1edc273",
  "description":"Ultimate POS - 1 items","expiration_time":"PT3M","country_code":"MEX",
  "user_id":"1058858496","status":"failed","status_detail":"failed","currency":"MXN",
  "created_date":"2026-07-18T18:06:53.47Z","last_updated_date":"2026-07-18T18:07:09.595Z",
  "config":{"point":{"terminal_id":"NEWLAND_N950__N950NCD100354983"}},
  "transactions":{"payments":[{"id":"PAY01KXV6HRXZTCPVWAXGA5NJTZTZ","amount":"330.00",
  "reference_id":"169441311314","status":"failed","status_detail":"high_risk",
  "payment_method":{"id":"debvisa"}}]}}

[mp-service] << 200 {"id":"ORD01KXV7JX96BZMGV7Y895BYJVPN","type":"point",
  "status":"failed","status_detail":"failed","currency":"MXN",
  "created_date":"2026-07-18T18:24:59.29Z","last_updated_date":"2026-07-18T18:25:07.853Z",
  "transactions":{"payments":[{"id":"PAY01KXV7JX9GHFQV09HQN0AQ8RXC","amount":"1075.00",
  "reference_id":"169444320888","status":"failed","status_detail":"in_review",
  "payment_method":{"id":"debmaster"}}]}}

[mp-service] << 200 {"id":"ORD01KXXXG7TPVHT3Z1HQD7RVN5V6","type":"point",
  "status":"failed","status_detail":"failed","currency":"MXN",
  "created_date":"2026-07-19T19:26:29.345Z","last_updated_date":"2026-07-19T19:26:37.867Z",
  "description":"Ultimate POS - 1 items",
  "transactions":{"payments":[{"amount":"945.00",
  "status":"failed","status_detail":"in_review",
  "payment_method":{"id":"debvisa"}}]}}

[mp-service] << 200 {"id":"ORD01KXXXT6GM52J20M0T2NPW39CM","type":"point",
  "status":"failed","status_detail":"failed","currency":"MXN",
  "created_date":"2026-07-19T19:31:55.648Z","last_updated_date":"2026-07-19T19:32:09.344Z",
  "description":"Self-checkout - 2 items",
  "config":{"point":{"terminal_id":"NEWLAND_N950__N950NCD100358887"}},
  "transactions":{"payments":[{"amount":"1125.00",
  "status":"failed","status_detail":"in_review",
  "payment_method":{"id":"visa"}}]}}

[mp-service] << 200 {"id":"ORD01KXY2CTQS3F7Q5PA08QY5A6TF","type":"point",
  "status":"failed","status_detail":"failed",
  "description":"Ultimate POS - 1 items",
  "transactions":{"payments":[{"amount":"350.00",
  "status":"failed","status_detail":"in_review",
  "payment_method":{"id":"visa"}}]}}

[mp-service] << 200 {"id":"ORD01KXY4THPAYNRCE2ZSQ2ZXM3X8","type":"point",
  "status":"failed","status_detail":"failed",
  "description":"Ultimate POS - 1 items",
  "transactions":{"payments":[{"amount":"350.00",
  "status":"failed","status_detail":"required_call_for_authorize",
  "payment_method":{}}]}}

[mp-service] << 200 {"id":"ORD01KXYCKJH92QPYRF0FHWRZJK0D","type":"point",
  "status":"failed","status_detail":"failed",
  "description":"Self-checkout - 1 items",
  "config":{"point":{"terminal_id":"NEWLAND_N950__N950NCD100358887"}},
  "transactions":{"payments":[{"amount":"500.00",
  "status":"failed","status_detail":"in_review",
  "payment_method":{"id":"sivale_desp"}}]}}

[mp-service] << 200 {"id":"ORD01KXYH25C1EHEQEYJY2QAVGAFA","type":"point",
  "status":"failed","status_detail":"failed",
  "description":"Self-checkout - 1 items",
  "config":{"point":{"terminal_id":"NEWLAND_N950__N950NCD100358887"}},
  "transactions":{"payments":[{"amount":"1050.00",
  "status":"failed","status_detail":"in_review",
  "payment_method":{"id":"visa"}}]}}
```

### Resumen de pagos fallidos

| Hora (CST) | Orden | Monto | Tipo | Tarjeta | `status_detail` (payment) |
|------------|-------|-------|------|---------|--------------------------|
| Sáb 12:06 | ORD01KXV6HRX... | $330 | POS | Deb Visa | `high_risk` |
| Sáb 12:24 | ORD01KXV7JX9... | $1,075 | POS | Deb Master | `in_review` |
| Dom 13:26 | ORD01KXXXG7T... | $945 | POS | Deb Visa | `in_review` |
| Dom 13:31 | ORD01KXXXT6G... | $1,125 | Self-checkout | Visa | `in_review` |
| Dom 14:52 | ORD01KXY2CTQ... | $350 | POS | Visa | `in_review` |
| Dom 15:34 | ORD01KXY4THP... | $350 | POS | Visa | `required_call_for_authorize` |
| Dom 17:50 | ORD01KXYCKJH... | $500 | Self-checkout | Sivale Despues | `in_review` |
| Dom 19:08 | ORD01KXYH25C... | $1,050 | Self-checkout | Visa | `in_review` |

### Log Snapshot — Pagos cancelados por terminal

```
[mp-service] << 200 {"id":"ORD01KXV4X94WWX4WASVWPJJD2GGD","type":"point",
  "external_reference":"612fc0d1-0259-4d46-9c39-2730200551b2",
  "description":"Ultimate POS - 1 items",
  "status":"canceled","status_detail":"canceled",
  "created_date":"2026-07-18T17:38:13.452Z","last_updated_date":"2026-07-18T17:38:24.359Z",
  "transactions":{"payments":[{"amount":"450.00",
  "status":"canceled","status_detail":"cancel_by_terminal"}]}}

[mp-service] << 200 {"id":"ORD01KXVPWYSZVJHMMME2KYMR9N50","type":"point",
  "external_reference":"4cc0af3e-4c58-42be-8be1-2255a65a5c1a",
  "status":"canceled","status_detail":"canceled",
  "created_date":"2026-07-18T22:52:37.176Z","last_updated_date":"2026-07-18T22:52:59.346Z",
  "transactions":{"payments":[{"amount":"...",
  "status":"canceled","status_detail":"cancel_by_terminal"}]}}

[mp-service] << 200 {"id":"ORD01KXVY2BA6MYQCJFDVHJDXXG0C","type":"point",
  "external_reference":"449f9adf-1ebe-47e1-8c74-efa943ec36f5",
  "status":"canceled","status_detail":"canceled",
  "created_date":"2026-07-19T00:57:53.852Z","last_updated_date":"2026-07-19T00:58:05.219Z",
  "transactions":{"payments":[{"amount":"...",
  "status":"canceled","status_detail":"cancel_by_terminal"}]}}
```

### Archivos Relevantes

| Archivo | Línea(s) | Relevancia |
|---------|----------|-----------|
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **136-140** | Solo maneja `mpStatus === 'failed'`, NO lee `transactions.payments[].status_detail` |
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **126-130** | Maneja `mpStatus === 'canceled'` pero NO distingue `cancel_by_terminal` |
| `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | **83-221** | Handler completo de polling donde debería mapearse el `status_detail` |
| `apps/ovejaposDEV/apps/backend/src/routes/self-checkout.ts` | **504** | Self-checkout: `['canceled', 'expired', 'failed'].includes(mpStatus)` sin `status_detail` |
| `apps/ovejaposDEV/apps/backend/src/routes/self-checkout.ts` | **464-531** | Handler de self-checkout polling |
| `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` | **24, 37** | `MPOrderResponse` declara `status_detail: string` pero nunca se lee en branching |
| `apps/ovejaposDEV/apps/backend/src/routes/webhooks.ts` | **74** | Webhook solo mapea `order.failed` a estado `cancelled` |
| `apps/ovejaposDEV/apps/frontend/src/components/pos/MPPointPayment/MPPointPayment.tsx` | **76-82** | UI solo tiene estado `failed` genérico, sin diferenciar `high_risk`/`in_review` |
| `apps/ovejaposDEV/apps/frontend/src/components/pos/MPPointPayment/MPPointPayment.tsx` | **113-121** | `toPaymentState()` NO lee `status_detail` |
| `apps/ovejaposDEV/packages/shared/src/types/order.ts` | **92** | `mpOrderStatus` tipo solo incluye order-level statuses |

### Causa Raíz

El código solo maneja el **order-level status** (`failed`, `canceled`) de la Orders API de MercadoPago. Los `status_detail` como `high_risk`, `in_review`, y `required_call_for_authorize` son **payment-level statuses** que vienen dentro de `transactions.payments[0].status_detail`. Estos valores **no están en ningún `if`/`switch` del código**.

Cuando MercadoPago marca un pago como `in_review`, el cliente simplemente ve "Pago fallido" en la terminal POS, sin saber que está en revisión o que necesita llamar al banco. El `status_detail` existe en el tipo TypeScript (`mp-point.ts:24`) pero nunca se usa para tomar decisiones.

### Qué Arreglar

1. **Backend (`orders.ts`, `self-checkout.ts`):** Leer `mpOrder.transactions?.payments?.[0]?.status_detail` y mapearlo:
   ```typescript
   const paymentDetail = mpOrder.transactions?.payments?.[0]?.status_detail
   if (paymentDetail === 'high_risk') { /* rechazo de fraude - mostrar mensaje específico */ }
   if (paymentDetail === 'in_review') { /* en revisión - usuario debe esperar */ }
   if (paymentDetail === 'required_call_for_authorize') { /* necesita auth del banco */ }
   ```
2. **Frontend (`MPPointPayment.tsx`):** Agregar UI diferenciada para cada `status_detail`
3. **Shared types:** Extender el tipo o agregar campo `paymentStatusDetail` al response del backend

---

## 4. Seguridad — Scanning/Ataque Automatizado (BLOQUEADO, OK)

### Log Snapshot — ovejapass-web (domingo ~04:00-04:38 CST, 951 intentos)

```
2026/07/18 20:07:52 [error] 23#23: *1129 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.env HTTP/1.1", host: "ovejapass.ovejasautomaticas.com"
2026/07/19 03:51:54 [error] 23#23: *1131 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.env?_=8iq49yar&v=nb509 HTTP/1.1", host: "ovejapass.ovejasautomaticas.com", 
  referrer: "https://duckduckgo.com/?q=5e01t"
2026/07/19 03:52:14 [error] 23#23: *1131 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.env?_=ru1ku2qz&v=jkh13 HTTP/1.1", host: "ovejapass.ovejasautomaticas.com", 
  referrer: "https://www.google.com/search?q=xcq10r"
2026/07/19 03:58:45 [error] 23#23: *1133 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.env.staging?_=6azdrjxl&v=8yttk HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:12:29 [error] 23#23: *1134 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.docker.env?_=8sy9q8mp&v=opiq3 HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:12:53 [error] 23#23: *1135 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.docker.env?_=emqgsv5h&v=zsv18 HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com", referrer: "https://ovejapass.ovejasautomaticas.com/admin"
2026/07/19 04:24:56 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /home/deploy/.ssh/id_rsa?_=r4gep8xv&v=ci2nw HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:25:10 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /home/ec2-user/.ssh/id_rsa?_=f97s1bv8&v=l17ki HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:25:45 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /.aws/credentials?_=d13jq4gw&v=2pyt9 HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:27:37 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /root/.bash_history?_=k6h19goo&v=y03ge HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:27:45 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /root/.mysql_history?_=ot33zgz5&v=86qqg HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
2026/07/19 04:27:57 [error] 23#23: *1136 access forbidden by rule, client: 172.18.0.10, server: _, 
  request: "GET /var/www/html/.git/config?_=0456xj16&v=mqkob HTTP/1.1", 
  host: "ovejapass.ovejasautomaticas.com"
```

### Intentos de path traversal y绕过 (ovejapass-web)

```
request: "GET /..%C0%AF..%C0%AFapp/.env?_=que6qrkf&v=fo127 HTTP/1.1"
request: "GET /..%C0%AF..%C0%AF.env?_=abxi2iwh&v=nxwbx HTTP/1.1"
request: "GET /..%C0%AF..%C0%AFetc/apache2/apache2.conf?_=clqny24v&v=pebrz HTTP/1.1"
request: "GET /..%C0%AF..%C0%AFetc%C0%AFpasswd?_=2dkftqlq&v=5y6h1 HTTP/1.1"
request: "GET /..../..../app/.env?_=7fca7cy7&v=hjf0n HTTP/1.1"
request: "GET /..../..../..../app/.env?_=99ly23go&v=940w4 HTTP/1.1"
request: "GET /..../..../..../..../.aws/credentials?_=6wcl4lgj&v=mk7dj HTTP/1.1"
request: "GET /%C0%AE%C0%AE/%C0%AE%C0%AE/.env?_=c5j7mraw&v=pefhy HTTP/1.1"
request: "GET /..%C0%AF.aws/credentials?_=2yky0y95&v=cv42w HTTP/1.1"
```

### Log Snapshot — finbalance (ataques PHP shell injection)

```
2026/07/18 07:28:19 [error] 33#33: *755 open() "/usr/share/nginx/html/.vite/manifest.json" failed (2: No such file or directory), 
  client: 172.18.0.10, server: localhost, request: "GET /.vite/manifest.json HTTP/1.1", 
  host: "finbalance.ovejasautomaticas.com"
2026/07/18 07:28:19 [error] 33#33: *755 open() "/usr/share/nginx/html/.env" failed (2: No such file or directory), 
  client: 172.18.0.10, server: localhost, request: "GET /.env HTTP/1.1", 
  host: "finbalance.ovejasautomaticas.com"
2026/07/18 07:28:20 [error] 33#33: *755 open() "/usr/share/nginx/html/.env.local" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /.env.local HTTP/1.1"
2026/07/18 07:28:21 [error] 33#33: *755 open() "/usr/share/nginx/html/secrets.json" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /secrets.json HTTP/1.1"
2026/07/18 07:28:22 [error] 33#33: *755 open() "/usr/share/nginx/html/.git/HEAD" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /.git/HEAD HTTP/1.1"
2026/07/18 19:41:44 [error] 30#30: *759 open() "/usr/share/nginx/html/serviceAccountKey.json" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /serviceAccountKey.json HTTP/1.1"
2026/07/18 19:41:45 [error] 30#30: *759 open() "/usr/share/nginx/html/credentials.json" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /credentials.json HTTP/1.1"
```

También intentaron inyectar shells PHP:
```
request: "GET /002.php HTTP/1.1"
request: "GET /06.php HTTP/1.1"
request: "GET /0byte.php HTTP/1.1"
request: "GET /100.php HTTP/1.1"
request: "GET /1.php HTTP/1.1"
request: "GET /2P.update.php HTTP/1.1"
request: "GET /666.php HTTP/1.1"
request: "GET /a1.php HTTP/1.1"
```

### Log Snapshot — oefashion (mismo patrón)

```
2026/07/18 09:04:08 [error] 31#31: *1527 open() "/usr/share/nginx/html/robots.txt" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /robots.txt HTTP/1.1", host: "oefashion.ovejasautomaticas.com"
2026/07/18 13:36:36 [error] 31#31: *1529 open() "/usr/share/nginx/html/.env" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /.env HTTP/1.1", host: "oefashion.ovejasautomaticas.com"
2026/07/18 13:36:36 [error] 31#31: *1529 open() "/usr/share/nginx/html/serviceAccountKey.json" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /serviceAccountKey.json HTTP/1.1"
2026/07/18 13:36:37 [error] 31#31: *1528 open() "/usr/share/nginx/html/.aws/credentials" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /.aws/credentials HTTP/1.1"
```

Intentaron WordPress scan:
```
request: "GET /2018/wp-includes/wlwmanifest.xml HTTP/1.1"
```

### Archivos Relevantes

| Archivo | Relevancia |
|---------|-----------|
| `apps/ovejapass/` (nginx config) | Bloquea paths sensibles con reglas de seguridad |
| `apps/FinBalance/` (nginx config) | Bloquea paths sensibles |
| `apps/OEFashion/` (nginx config) | Bloquea paths sensibles |
| `traefik/` | Reverse proxy con reglas de seguridad |

### Causa Raíz

Bots automatizados (probablemente Mirai o similar) escaneando buscando:
- Archivos de config: `.env`, `.docker.env`, `.env.staging`, `secrets.json`, `credentials.json`
- Llaves SSH: `.ssh/id_rsa`, `.ssh/id_ed25519`
- AWS: `.aws/credentials`, `.aws/config`
- Git: `.git/config`, `.git/HEAD`
- Historiales: `.bash_history`, `.mysql_history`
- Shells PHP: `0.php`, `1.php`, `666.php`, `a1.php`
- Path traversal: `..%C0%AF` (UTF-8 overlong encoding bypass)

**Todos bloqueados por nginx con 403 Forbidden.** La seguridad funciona correctamente.

### Qué Arreglar

- **Opcional:** Agregar rate limiting en Traefik/nginx para reducir volumen de logs
- **Opcional:** Geo-blocking si el tráfico legítimo es solo de México
- **Opcional:** Fail2ban o similar para banear IPs que generen muchos 403

---

## 5. Issues Menores

### 5a. OvejaPass API — Endpoint de monitoreo no existe

```
❌ GET /api/telescope/requests 404 - 2ms
```

**Archivo:** `apps/ovejapass/` (API routes)
**Fix:** Crear el endpoint de telescope o deshabilitar la health check que lo llama.

### 5b. OEFashion — Falta robots.txt

```
2026/07/18 09:04:08 [error] 31#31: *1527 open() "/usr/share/nginx/html/robots.txt" failed (2: No such file or directory), 
  client: 172.18.0.10, server: localhost, request: "GET /robots.txt HTTP/1.1", 
  host: "oefashion.ovejasautomaticas.com"
```

**Archivo:** `apps/OEFashion/` — Static files para nginx
**Fix:** Agregar `robots.txt` al build/output de OEFashion.

### 5c. FinBalance — Falta favicon.ico

```
2026/07/18 06:38:53 [error] 33#33: *753 open() "/usr/share/nginx/html/favicon.ico" failed (2: No such file or directory), 
  client: 172.18.0.10, server: localhost, request: "GET /favicon.ico HTTP/1.1", 
  host: "finbalance.ovejasautomaticas.com"
```

**Archivo:** `apps/FinBalance/` — Static files para nginx
**Fix:** Agregar `favicon.ico` al build/output de FinBalance.

### 5d. FinBalance — Bug de interpolación en asset path

```
2026/07/18 07:30:02 [error] 33#33: *755 open() "/usr/share/nginx/html/assets/${c}" failed (2: No such file or directory), 
  client: 172.18.0.10, server: localhost, request: "GET /assets/$%7Bc%7D HTTP/1.1", 
  host: "finbalance.ovejasautomaticas.com"
```

**Archivo:** `apps/FinBalance/` — Alguna referencia a `${c}` no se resolvió en build time.
**Fix:** Buscar en el código de FinBalance la referencia a `assets/${c}` y corregir la interpolación (probablemente un template literal de JavaScript que no se procesó).

### 5e. OvejaPass Web — Falta next.config.js y server.js (falso positivo)

```
2026/07/19 04:13:37 [error] 23#23: *1135 open() "/usr/share/nginx/html/next.config.js" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /next.config.js?_=wpyl49m6&v=rs4h9 HTTP/1.1"
2026/07/19 04:13:50 [error] 23#23: *1135 open() "/usr/share/nginx/html/server.js" failed (2: No such file or directory), 
  client: 172.18.0.10, request: "GET /server.js?_=oqxpc6lo&v=itfbl HTTP/1.1"
```

Estos son intentos de los bots de scanning, no problemas reales. OvejaPass web es una SPA en Nginx, no tiene estos archivos.

---

## 6. Resumen de Acciones

| # | Severidad | Issue | Archivo a Modificar | Línea |
|---|-----------|-------|-------------------|-------|
| 1 | CRÍTICA | Server Actions not found | Redeploy frontend con `--no-cache` | N/A (infra) |
| 2 | MEDIA | `undefined` en MP polling log | `apps/ovejaposDEV/apps/backend/src/services/mp-point.ts` | 67 |
| 3 | MEDIA | Pagos fallidos sin UI diferenciada | `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | 136-140 |
| 3b | MEDIA | Pagos fallidos sin UI diferenciada | `apps/ovejaposDEV/apps/frontend/src/components/pos/MPPointPayment/MPPointPayment.tsx` | 76-82, 113-121 |
| 3c | MEDIA | `cancel_by_terminal` sin distinguir | `apps/ovejaposDEV/apps/backend/src/routes/orders.ts` | 126-130 |
| 4 | OK | Scanning bloqueado | Ninguno (funciona bien) | - |
| 5a | BAJA | Falta endpoint telescope | `apps/ovejapass/` | - |
| 5b | BAJA | Falta robots.txt OEFashion | `apps/OEFashion/` | - |
| 5c | BAJA | Falta favicon.ico FinBalance | `apps/FinBalance/` | - |
| 5d | BAJA | Bug interpolación `${c}` FinBalance | `apps/FinBalance/` | - |
