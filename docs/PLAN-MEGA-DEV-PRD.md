# MEGA PLAN - DEV/PRD MIGRACIÓN (Estado verificado)

## 1. HECHO (Completed) - Lo que ya ejecutamos

### Fase 0: Respaldo y preparación
- [x] Tags de retorno: pre-fase1-20261006-063157 en DEV y PRD
- [x] Respaldo completo: /home/admin_OvejasAutomaticas/backup-fase0-20261006-063157/
  - [x] db-dev.json (834 órdenes), db-prd.json (774 órdenes)
  - [x] .env DEV y PRD con permisos 600
  - [x] HEADs + containers-before.txt
- [x] Validación de credenciales nuevas (app MP 2190382874875741) contra API MP

### Fase 1a: Arreglo webhook MP (PRD)
- [x] Commit 071e8b1: Webhook deja de responder 401. Reconciliación por consulta a MP (autoritativo)
- [x] Commit f19b78c: Guard que verifica que la orden creada sea legible con el mismo token (bloquea solo ante 404 persistente, retry 1 vez). No bloquea ante errores transitorios (rate limit, timeout)
- [x] Webhooks DEV y PRD alineados (contenido idéntico). Handler Clip intacto
- [x] Deploy PRD backend/frontend (4480d29 incluye mpWebhookSecret)

### Alineación de tiendas (PRD)
- [x] d0602325 (PRD): token corregido a app nueva 2190382874875741 (cuenta 1058858496). activeCardProvider explícito
- [x] de475700 (PRD): token app nueva
- [x] 0185a046 (PRD): Clip (cuenta distinta 756332294) - intacto
- [x] Tiendas sin token (585f553d, 4de731cc): con default implícito (no riesgo)

### Infraestructura
- [x] Plan verificado guardado en docs/PLAN-DEV-PRD.md (DEV 92465b3)
- [x] mpWebhookSecret: agregado a shared/types, SENSITIVE_KEYS (backend), UI en Settings (frontend). Cifrado AES-256-GCM. No se exige aún
- [x] DEV NO modificado hoy (uptime 9 días). PRD solo tocado/desplegado

## 2. PENDIENTE (Remaining) - Lo que falta

### A) Crítico - Validación en producción (PRD)
- [ ] **1. Confirmar URL webhook en panel MP** (app 2190382874875741, producción): `https://api-ovejapos.ovejasautomaticas.com/webhooks/mp-point`
- [ ] **2. Venta de $1 en PRD** (tienda `de475700`) con terminal física
- [ ] **3. Verificar logs PRD** durante la venta: webhook debe llegar Y mostrar consulta a MP (no solo `200`). Buscar tráfico en `ovejapos-prd-backend`
- [ ] **4. Validar estado final**: orden `paid/paid`, MP `processed/accredited`

### B) Sanitización de datos copiados de DEV → PRD (crucial por confusión)
Los datos que se copiaron con credenciales de DEV afectan principalmente a PRD.

| Tabla/Elemento | Estado actual | Acción pendiente | Notas |
|---|---|---|---|
| `stores.settings` (PRD) | Parcialmente corregido (d0602325). Otros mezclados | **Sanitizar todas las tiendas PRD** para forzar tokens de app PRD (`2190382874875741`) y/o limpiar valores heredados de DEV | Ya alineamos d0602325. de475700 ok. 0185a046 usa Clip (correcto). |
| `digital_passes` (PRD) | Posibles datos copiados de DEV | **Revisar**: ¿son pases reales emitidos en PRD o copiados de DEV? | Colisión por passTypeID/classId/serialNumber entre ambientes (documentado). No bloquea cobros. Conservar solo si son reales de PRD. |
| `orders`, `order_items` (PRD) | 774 órdenes | **Confirmar origen**: ¿son ventas reales de producción o pruebas? | **Decisivo** para borrar vs sanitizar. Si son pruebas → reiniciar PRD limpio es más fácil. Si son reales → conservar y sanitizar solo credenciales. |
| `customers`, `loyalty_*` (PRD) | Datos mezclados | **Evaluar** si conservar o limpiar según decisión de órdenes | Depende de si PRD tenía datos reales antes del copy. |
| `products` (PRD) | Compartidos/mezclados | Revisar, probablemente menor riesgo | No contiene secretos. |

### C) Hardening (después de validación exitosa)
- [ ] **Activar enforcement de firma de webhook** con `mpWebhookSecret` (cuando tengamos al menos 1 entrega válida de MP observada). Hoy solo registra advertencias.
- [ ] **Portar guard (f19b78c) a DEV** en próximo deploy (no urgente, respetamos uptime). DEV ya tiene webhook arreglado.

### D) Limpieza/decisión estratégica (según A+B)
- [ ] **Decisión: borrar PRD vs sanitizar** - Basada en respuesta: ¿774 órdenes son reales (producción) o pruebas?
  - Si **pruebas** → Borrar PRD y empezar limpio (más fácil, sin residuos DEV). Reconfigurar credenciales PRD desde cero.
  - Si **reales** → NO borrar. Sanitizar únicamente `stores.settings`, revisar `digital_passes`, corregir credenciales mezcladas. Conservar órdenes/clientes.
- [ ] **Tiendas sin token** (585f553d, 4de731cc): decidir si poner `activeCardProvider` explícito o dejar implícito (sin riesgo mientras no usen MP)
- [ ] **Wallet passes**: resolver colisión entre ambientes (separación por ambiente) - no bloquea cobros, queda para después

### E) Mejoras operativas (futuro, no bloqueantes)
- [ ] Respaldos automáticos (dumps programados + rotación .env)
- [ ] Separar SETTINGS_ENCRYPTION_KEY entre DEV/PRD (PRD hoy reutiliza secreto DEV)
- [ ] Separar Stripe webhook (hoy apunta a DEV)
- [ ] Rate limiting Traefik (desactivado, propuesto 500/s alto)
