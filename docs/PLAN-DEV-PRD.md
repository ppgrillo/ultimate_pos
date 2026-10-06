# Plan DEV → PRD

Estado al 6 de octubre de 2026. Este documento registra lo verificado contra
los sistemas en producción, no lo que se supone que debería pasar.

## Entornos

| | DEV | PRD |
|---|---|---|
| Frontend | `dev.ovejapos.ovejasautomaticas.com` | `ovejapos.ovejasautomaticas.com` |
| API | `api-dev.ovejapos.ovejasautomaticas.com` | `api-ovejapos.ovejasautomaticas.com` |
| Webhook MP | `/webhooks/mp-point` en `api-dev` | `/webhooks/mp-point` en `api-ovejapos` |
| Base | Supabase propia | Supabase propia |
| Contenedores | `ovejapos-dev-*` | `ovejapos-prd-*` |

La salud del frontend se expone en `/api/health`, no en `/health` (ese devuelve
404 y es esperado). Un `400` en `POST /auth/login` viene de la validación de
esquema, que exige contraseña de 6 caracteres o más; con una contraseña de largo
correcto el mismo endpoint responde `401 Invalid login credentials`.

## Por qué PRD perdía pagos

La rama `prd` corría el webhook anterior al arreglo de DEV. Ese código usaba la
verificación de firma como puerta de entrada, y la clave guardada era el Client
Secret de OAuth y no la clave de firma del webhook. Toda notificación de
Mercado Pago recibía `401`. Como el cobro se fazia en el terminal físico igual,
una venta en PRD habría sido cobrada y nunca registrada.

Corregido en `071e8b1`, que consulta el estado real a la API de MP y aplica
solo lo que MP confirma. El handler de Clip quedó intacto.

## Credenciales

Cada aplicación de MP tiene su propia URL y su propia clave de firma. Point no
acepta `notification_url` por orden, así que la configuración vive en la app.

Los terminales se asocian a la cuenta del comercio, no a la aplicación: el
terminal `NEWLAND_N950__N950NCD100358887` se usa desde más de una aplicación en
la misma cuenta. Esa separación es la que hace posible que DEV y PRD sean
independientes sobre el mismo hardware.

Un access token solo ve las órdenes creadas por su propia aplicación. Las
órdenes históricas de PRD dan `404` contra el token nuevo y `200` contra el
viejo: es comportamiento normal de MP, no pérdida de datos.

| Tienda | Cuenta | Aplicación | Token |
|---|---|---|---|
| `de475700` DEV | 1058858496 | `8314148213491648` | el existente |
| `de475700` PRD | 1058858496 | `2190382874875741` | el nuevo |
| `d0602325` | 1058858496 | `2157301964147036` | **app vieja, ver riesgos** |
| `0185a046` | 756332294 | `6261922992935088` | el existente |

## Riesgos abiertos

**`d0602325` en PRD** tiene el token de una aplicación cuyas notificaciones
apuntan al webhook de DEV. Si vendiera ahí, el pago se cobraría y PRD nunca lo
reconciliaría. Ya no depende del valor por defecto de proveedor, pero sigue
usando un token de otra aplicación. Decisión pendiente del dueño: actualizar su
token a la app nueva o dejar la tienda sin uso en PRD.

**El guard de `f19b78c` no cubre el caso anterior.** Lee la orden recién creada
con el mismo token, y eso detecta credenciales malas, pero no detecta que la
app notifique a otro ambiente: ahí la lectura sí funciona. Ese caso se
detecta mirando el webhook durante una venta de prueba, no desde el código.

**Firma del webhook sin aplicar.** La verificación se registra como advertencia
y no bloquea. Falta el campo `mpWebhookSecret` por tienda para poder exigirla
después de observar una entrega válida real.

**Sin respaldo automático.** No hay dumps programados ni copia de `.env` en
rotación. El respaldo de esta intervención está en
`/home/admin_OvejasAutomaticas/backup-fase0-20261006-063157/` con las bases
completas de ambos ambientes, los `.env` con permisos `600` y los HEAD de cada
repositorio. Los tags `pre-fase1-20261006-063157` permiten volver atrás.

**Rate limiting desactivado** en ambos ambientes tras `5eab72f`.

**Claves compartidas.** Stripe usa las mismas credenciales live en DEV y PRD, y
solo existe un endpoint webhook, que apunta a DEV. La clave de cifrado de
ajustes de PRD coincide con el secreto de sesión de DEV.

**Colisión de pases.** 53 de 54 pases de lealtad existen en ambos ambientes con
el mismo identificador. En Apple y Google Wallet eso choca por `passTypeID`,
`classId` y número de serie, así que un pase emitido en un ambiente puede
presentarse como emitido en el otro. Necesita separación por ambiente.

## Prueba de venta

Antes de vender en PRD:

1. Confirmar en el panel de MP que la app `2190382874875741` tiene la URL
   `https://api-ovejapos.ovejasautomaticas.com/webhooks/mp-point` en producción.
2. Cobrar `$1` desde la tienda `de475700` de PRD.
3. Verificar en los logs del backend de PRD que llega la notificación y que el
   log muestra una consulta a MP, no solo un `200`.
4. Confirmar la orden en `paid`, que MP reporta `processed` y `accredited`.

Si el paso 3 no muestra tráfico, la app no está notificando a este ambiente y
hay que corregir la URL en el panel antes de intentar nada más.