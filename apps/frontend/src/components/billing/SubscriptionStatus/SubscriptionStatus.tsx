'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  useGetBillingStatusQuery,
  useCreatePortalSessionMutation,
  useCreateCheckoutSessionMutation,
  useRefreshBillingMutation,
} from '@/store/api'
import { CreditCard, RefreshCw, Sparkles, ShieldAlert, XCircle } from 'lucide-react'

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Activa', className: 'bg-primary/15 text-primary border-primary/30' },
  trialing: { label: 'En prueba', className: 'bg-primary/15 text-primary border-primary/30' },
  past_due: { label: 'Pago pendiente', className: 'bg-warning/15 text-warning border-warning/30' },
  canceled: { label: 'Cancelada', className: 'bg-error/15 text-error border-error/30' },
  unpaid: { label: 'Sin pagar', className: 'bg-error/15 text-error border-error/30' },
  inactive: {
    label: 'Inactiva',
    className: 'bg-surface-container text-on-surface-variant border-outline-variant/50',
  },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  const code = currency.toUpperCase()
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(
    amount / 100,
  )
}

export function SubscriptionStatus() {
  const { data, isLoading, refetch } = useGetBillingStatusQuery()
  const [createPortal, { isLoading: isPortalLoading }] = useCreatePortalSessionMutation()
  const [createCheckout, { isLoading: isCheckoutLoading }] = useCreateCheckoutSessionMutation()
  const [refreshBilling, { isLoading: isRefreshing }] = useRefreshBillingMutation()

  const meta = data ? STATUS_META[data.status] ?? STATUS_META.inactive : null

  const handleManage = async () => {
    const session = await createPortal().unwrap().catch(() => null)
    if (session?.url) window.location.assign(session.url)
  }

  const handleSubscribe = async () => {
    const session = await createCheckout().unwrap().catch(() => null)
    if (session?.url) window.location.assign(session.url)
  }

  const handleRefresh = async () => {
    await refreshBilling()
    refetch()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Mi suscripción
        </CardTitle>
        <CardDescription>Estado de tu plan de Oveja POS y próximos pagos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <p className="text-sm text-on-surface-variant">Cargando estado de tu suscripción...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Estado</p>
                {meta && (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold ${meta.className}`}>
                    {meta.label}
                  </span>
                )}
              </div>
              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Plan</p>
                <p className="text-sm font-bold text-on-surface">
                  {data.plan ? `${formatAmount(data.plan.amount, data.plan.currency)} / mes` : 'Oveja POS — Plan Pro'}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Próximo pago
                </p>
                <p className="text-sm font-bold text-on-surface">{formatDate(data.currentPeriodEnd)}</p>
              </div>
              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Período actual
                </p>
                <p className="text-sm text-on-surface">
                  {formatDate(data.currentPeriodStart)} → {formatDate(data.currentPeriodEnd)}
                </p>
              </div>
            </div>

            {data.cancelAtPeriodEnd && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
                <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
                <p className="text-sm text-on-surface">
                  Tu suscripción se cancelará al final del período actual ({formatDate(data.currentPeriodEnd)}). Puedes
                  reactivarla desde el botón “Administrar suscripción”.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {data.hasAccess ? (
                <>
                  <Button onClick={handleManage} isLoading={isPortalLoading}>
                    <CreditCard className="h-4 w-4 mr-2" /> Administrar suscripción
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} isLoading={isRefreshing}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Actualizar estado
                  </Button>
                  <Button variant="danger" onClick={handleManage} isLoading={isPortalLoading}>
                    <XCircle className="h-4 w-4 mr-2" /> Cancelar suscripción
                  </Button>
                </>
              ) : (
                <Button onClick={handleSubscribe} isLoading={isCheckoutLoading}>
                  <Sparkles className="h-4 w-4 mr-2" /> Activar suscripción
                </Button>
              )}
            </div>

            <p className="text-xs text-on-surface-variant">
              Tus facturas, método de pago y cancelación se gestionan en el portal seguro de Stripe. “Cancelar
              suscripción” te lleva al portal para confirmar: se cancela al final del período actual y mantienes acceso
              hasta esa fecha.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
