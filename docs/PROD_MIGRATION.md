# Migración dev → prod — Guía y estado

Fecha: 2026-09-23. Origen: dev `motsyjbdsawkedbhbuea.supabase.co` → Destino: prod `bwdnupjbaevzaqxmeaaj.supabase.co`.

## 1. Estado: ¿es copia exacta?

**Sí a nivel de datos** — todo verificado 1:1:

| Capa | dev | prod | Verificado |
|---|---|---|---|
| Tablas `public` (22) | idéntico conteo por tabla | idéntico | ✅ |
| `auth.users` / `auth.identities` | 7 / 7 | 7 / 7 | ✅ |
| Storage `product-images` | 45 archivos | 45 archivos | ✅ |
| Esquema (tablas/funciones/policies/índices/triggers/enums) | 24/15/35/65/15/9 | idéntico | ✅ |

**No es copia byte-a-byte**, hay diferencias intencionales:
- `NEXTAUTH_SECRET` distinto en prod (generado nuevo) ⇒ **re-login obligatorio** en prod.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` apuntan a su propio proyecto.
- **2 productos quedaron con `image_url = NULL`** en prod (hamburguesa `b12f1f4d-d191-4092-a72d-c6aa143d5ab6` y "Leche con chocolate" `b6710989-60e1-4b89-ae7d-9cb6dfd92852`) — por instrucción, se suben a mano después.
- Env vars de dominios siguen con placeholders (`tu-dominio.com`).

## 2. Conteos por tabla (dev = prod)

| Tabla | Filas |
|---|---|
| profiles | 7 |
| stores | 5 |
| store_members | 5 |
| categories | 5 |
| customers | 62 |
| suppliers | 3 |
| loyalty_cards | 53 |
| products | 24 |
| digital_passes | 53 |
| loyalty_transactions | 111 |
| orders | 772 |
| order_items | 909 |
| payments | 757 |
| checks | 17 |
| loyalty_rewards | 4 |
| reward_redemptions | 8 |
| promotions | 2 |
| apple_registrations | 6 |
| expenses | 6 |
| billing | 2 |
| settings_change_log | 4 |
| customer_order_stats | 83 |

## 3. Tarjetas de lealtad / wallets

Los datos están migrados (cards, digital_passes, transactions, registrations), así que la **lectura del lado del backend funciona igual en ambos ambientes** (mismo código, apunta a su propio Supabase).

⚠️ **Importante — la generación de passes necesita credenciales que NO están en el repo** (se copian al servidor):

- **Apple Wallet**: certificados `wwdr.pem`, `signerCert.pem`, `ovejaPass.key` + `.p8` de APNS. Resolución de paths en `apps/backend/src/services/appleWallet.service.ts` (Docker `/app/certs`, o `.env`, o `certs/` en raíz) y `appleWallet.apns.ts`. Envs: `APPLE_PASS_CERT_WWDR_PATH`, `APPLE_PASS_KEY_PASSPHRASE`, `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_ID`, `APPLE_APNS_KEY_ID`, `APPLE_APNS_TEAM_ID`, `APPLE_APNS_TOPIC`, `APPLE_APNS_P8_PATH`.
- **Apple Wallet web service**: `APPLE_WALLET_WEB_SERVICE_URL` debe apuntar a la URL pública del backend de prod (Apple tiene que alcanzarlo para registrarte actualizaciones). No está en `.env.prod`.
- **Google Wallet**: `GOOGLE_WALLET_ISSUER_ID` y `GOOGLE_SERVICE_ACCOUNT_PATH` (`service-account-key.json`). No están en `.env.prod`.

Los `barcode_value`/`apple_pass_id`/`google_pass_id` se leen directo de la tabla migrada; lo único que requiere config es la **primera generación/actualización** de un pass.

## 4. Login

Flujo: NextAuth (Google) → `/auth/check-google` + `/auth/me` del backend → mint de JWT firmado con **`NEXTAUTH_SECRET`**.

- En prod ya está el `NEXTAUTH_SECRET` generado y el Google Client (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` copiados de dev). `SETTINGS_ENCRYPTION_KEY` fijada = la de dev (dev cifra con el fallback).
- ⚠️ **Google Cloud Console**: los **redirect URIs** de OAuth deben incluir el dominio real de prod (`https://<tu-dominio>/api/auth/callback/google`) y el frontend `NEXTAUTH_URL` del `.env.prod` debe apuntar a él. Hoy no existe → login Google fallará en prod hasta agregarlo.
- Emails/passwords: `auth.users` migrado, `signInWithPassword` funcionará igual que dev.
- Tokens JWT emitidos por backend usan `NEXTAUTH_SECRET` → **nadie queda logueado al deployar** (esperado).

## 5. Stripe (subscription billing)

`.env.prod` tiene las **mismas keys live de dev** (`sk_live_51QC…`, `whsec_KbTH…`, `price_1U46…`).

- La tabla `billing` está migrada (2 filas) y `getBillingInfo()`/`has_access` leerá el estado correcto.
- ⚠️ **Webhook**: `STRIPE_WEBHOOK_SECRET` es específico de un *endpoint* de Stripe. El dashboard de Stripe debe tener un endpoint de webhook apuntando a la **URL pública del backend de prod** (rutas `/api/webhooks/stripe` o similar) con su propio `whsec_`. Si el endpoint actual apunta a dev (ngrok/localhost), prod no recibirá eventos.
- `STRIPE_PRICE_ID` compartido entre ambientes es válido porque es la misma cuenta Stripe.
- `FRONTEND_URL` (backend) y `NEXTAUTH_URL`/`NEXT_PUBLIC_API_URL` (frontend) deben apuntar al dominio real de prod para que los redirects de checkout/portal funcionen.

## 6. `.env.prod` — estado

| Var | Backend | Frontend |
|---|---|---|
| SUPABASE_URL / ANON / SERVICE_ROLE | ✅ (prod) | — |
| NEXTAUTH_SECRET | ✅ generado | ✅ igual |
| SETTINGS_ENCRYPTION_KEY | ✅ = dev | — |
| CORS_ORIGIN / FRONTEND_URL / PUBLIC_API_URL | ⏳ placeholder | — |
| NEXT_PUBLIC_API_URL / NEXTAUTH_URL | — | ⏳ placeholder |
| AUTH_GOOGLE_ID / SECRET | — | ✅ (de dev) |
| Stripe (SK/WH/SI/PRICE) | ✅ (live de dev) | — |
| Wallets (APPLE_*, GOOGLE_*) | ⏳ pendiente | — |

## 7. TODOs manuales pendientes

1. **Dominios reales** en ambos `.env.prod` (CORS_ORIGIN, FRONTEND_URL, PUBLIC_API_URL, NEXT_PUBLIC_API_URL, NEXTAUTH_URL).
2. **Google OAuth redirect URIs** de prod en Google Cloud Console.
3. **Certificados de wallet** (Apple + APNS `.p8`, Google service-account) en el server de prod + envs `APPLE_*`/`GOOGLE_*`.
4. **Stripe webhook endpoint** nuevo apuntando a la URL pública del backend de prod; pegar su `whsec_` en `.env.prod`.
5. **`APPLE_WALLET_WEB_SERVICE_URL`** = URL pública del backend de prod.
6. Subir las **2 imágenes** que quedaron `NULL` (hamburguesa, leche con chocolate) y actualizar `products.image_url`.
7. **Re-login** de todos los usuarios (JWT secret cambió).

## 8. Scripts de migración (reusables)

- `scripts/migrate-data.mjs` — copia tablas dev → prod vía service_role (idempotente, `upsert onConflict: id`). Fuente: `apps/backend/.env` (dev); destino: `apps/backend/.env.prod`. Uso: `node scripts/migrate-data.mjs`.
- `scripts/copy-storage.mjs` — copia bucket `product-images` dev → prod (45/45 ok). Uso: `node scripts/copy-storage.mjs`.

Ambos leen las keys desde los `.env`, no hardcodean nada.