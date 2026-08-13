'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useGetBillingStatusQuery,
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
  useRefreshBillingMutation,
} from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/Button'
import { Sparkles, Check } from 'lucide-react'

const FEATURES = [
  'Punto de venta completo',
  'Gestión de productos y categorías',
  'Pedidos y comandas de cocina',
  'Clientes y tarjetas de lealtad',
  'Analytics e informes de ventas',
  'Expensas y control de inventario',
]

export function BillingGate({ children }: { children: React.ReactNode }) {
  const params = useSearchParams()
  const sessionHasAccess = useAppSelector((state) => state.auth.user?.has_access ?? false)
  const {
    data,
    isLoading,
    refetch,
  } = useGetBillingStatusQuery(undefined, {
    skip: sessionHasAccess,
    refetchOnMountOrArgChange: true,
    pollingInterval: 15000,
  })
  const [createCheckout, { isLoading: isCreating }] = useCreateCheckoutSessionMutation()
  const [createPortal, { isLoading: isPortalLoading }] = useCreatePortalSessionMutation()
  const [refreshBilling] = useRefreshBillingMutation()

  const justCompleted = params?.get('checkout') === 'success'

  useEffect(() => {
    if (justCompleted) {
      refreshBilling().finally(() => refetch())
    }
  }, [justCompleted, refreshBilling, refetch])

  const handleSubscribe = async () => {
    const session = await createCheckout().unwrap().catch(() => null)
    if (session?.url) {
      window.location.assign(session.url)
    } else if (session?.alreadyActive) {
      refetch()
    }
  }

  const handleManage = async () => {
    const session = await createPortal().unwrap().catch(() => null)
    if (session?.url) window.location.assign(session.url)
  }

  if (sessionHasAccess) return <>{children}</>

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (data?.hasAccess) return <>{children}</>

  const needsPaymentMethod = data?.status === 'past_due' || data?.status === 'unpaid'

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" />
              Plan Pro
            </span>
            <span className="text-sm font-bold text-on-surface">Oveja POS</span>
          </div>

          <h1 className="text-2xl font-heading font-bold text-on-surface sm:text-3xl">
            Activa tu suscripción
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Desbloquea todas las herramientas de tu negocio en un solo lugar.
          </p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-heading font-bold text-on-surface">$100</span>
            <span className="text-sm font-semibold text-on-surface-variant">MXN / mes</span>
          </div>

          <ul className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-on-surface">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            <Button
              size="lg"
              className="w-full"
              isLoading={isCreating}
              onClick={handleSubscribe}
            >
              {needsPaymentMethod ? 'Actualizar método de pago' : 'Suscribirme ahora'}
            </Button>

            <p className="text-center text-xs text-on-surface-variant">
              Acceso anticipado: usa el código{' '}
              <span className="font-bold text-primary">OVEJA90</span> al pagar y obtén un 90% de
              descuento.
            </p>
          </div>

          {(needsPaymentMethod || data?.status === 'canceled') && (
            <div className="mt-4">
              <Button variant="outline" className="w-full" isLoading={isPortalLoading} onClick={handleManage}>
                Administrar mi suscripción
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
