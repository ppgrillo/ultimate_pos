'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { useAppSelector } from '@/store/hooks'
import { api } from '@/lib/api/client'
import {
  Plus, Copy, RefreshCw, Trash2, Terminal, Link as LinkIcon, Check,
  Circle, AlertTriangle, Info,
} from 'lucide-react'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'
import type { CardPaymentProviderName } from '@ultimate-pos/shared'
import { getActiveCardProvider, cardProviderDisplayName } from '@/lib/card-payments'

type TerminalStatus = 'available' | 'pos' | 'station' | 'conflict'

interface TerminalInfo {
  id: string
  model: string
  operating_mode: string
  status: TerminalStatus
  usedBy: string[]
}

function computeTerminalStatuses(
  terminals: Array<{ id: string; model: string; operating_mode: string }>,
  posTerminalId: string | undefined,
  stations: SelfCheckoutStation[],
): TerminalInfo[] {
  return terminals.map((t) => {
    const usedBy: string[] = []
    const isPOS = posTerminalId === t.id
    if (isPOS) usedBy.push('POS principal')

    const stationNames = stations
      .filter((s) => s.terminalId === t.id)
      .map((s) => s.name)
    usedBy.push(...stationNames)

    const status: TerminalStatus =
      usedBy.length === 0 ? 'available'
        : isPOS && stationNames.length > 0 ? 'conflict'
        : isPOS ? 'pos'
        : 'station'

    return { ...t, status, usedBy }
  })
}

const statusConfig: Record<TerminalStatus, { icon: typeof Circle; color: string; label: string }> = {
  available:    { icon: Circle, color: 'text-primary',         label: 'Disponible' },
  pos:          { icon: AlertTriangle, color: 'text-amber-400', label: 'En uso: POS principal' },
  station:      { icon: AlertTriangle, color: 'text-amber-400', label: 'En uso' },
  conflict:     { icon: AlertTriangle, color: 'text-error',     label: 'En uso: POS + estación(es)' },
}

export function SelfCheckoutSettings() {
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const posTerminalId = (store?.settings as unknown as Record<string, unknown>)?.mpPointTerminalId as string | undefined

  const [stations, setStations] = useState<SelfCheckoutStation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTerminalId, setNewTerminalId] = useState('')
  const [newProvider, setNewProvider] = useState<CardPaymentProviderName>('mercado_pago')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [terminals, setTerminals] = useState<Array<{ id: string; model: string; operating_mode: string }> | null>(null)
  const [listingTerminals, setListingTerminals] = useState(false)
  const [confirmTerminal, setConfirmTerminal] = useState<{ id: string; usedBy: string[] } | null>(null)

  useEffect(() => {
    if (store?.settings?.selfCheckoutStations) {
      setStations(store.settings.selfCheckoutStations as SelfCheckoutStation[])
    }
  }, [store])

  useEffect(() => {
    setNewProvider(getActiveCardProvider(store?.settings))
  }, [store?.settings])

  const terminalInfos = useMemo(
    () => terminals
      ? computeTerminalStatuses(terminals, posTerminalId, stations)
      : null,
    [terminals, posTerminalId, stations],
  )

  async function listTerminals() {
    setListingTerminals(true)
    try {
      const res = await api.get<{ terminals: Array<{ id: string; model: string; operating_mode: string }> }>('/stores/terminals', {
        params: { provider: newProvider },
      })
      setTerminals(res.terminals)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to list terminals')
    } finally {
      setListingTerminals(false)
    }
  }

  function handleSelectTerminal(t: TerminalInfo) {
    if (t.status === 'available') {
      setNewTerminalId(t.id)
      return
    }
    setConfirmTerminal({ id: t.id, usedBy: t.usedBy })
  }

  function confirmOccupiedTerminal() {
    if (!confirmTerminal) return
    setNewTerminalId(confirmTerminal.id)
    setConfirmTerminal(null)
  }

  async function createStation() {
    if (!newName.trim() || !newTerminalId.trim()) return
    setCreating(true)
    try {
      const res = await api.post<{ data: SelfCheckoutStation }>('/stores/self-checkout/stations', {
        name: newName.trim(),
        terminalId: newTerminalId.trim(),
        provider: newProvider,
      })
      setStations((prev) => [...prev, res.data])
      setShowForm(false)
      setNewName('')
      setNewTerminalId('')
      setTerminals(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating station')
    } finally {
      setCreating(false)
    }
  }

  async function regenerateToken(stationId: string) {
    setRegeneratingId(stationId)
    try {
      const res = await api.post<{ data: { id: string; token: string } }>(
        `/stores/self-checkout/stations/${stationId}/token`,
      )
      setStations((prev) =>
        prev.map((s) => (s.id === stationId ? { ...s, token: res.data.token } : s)),
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error regenerating token')
    } finally {
      setRegeneratingId(null)
    }
  }

  async function deleteStation(stationId: string) {
    if (!confirm('Delete this self-checkout station?')) return
    try {
      await api.delete(`/stores/self-checkout/stations/${stationId}`)
      setStations((prev) => prev.filter((s) => s.id !== stationId))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting station')
    }
  }

  function copyUrl(token: string, id: string) {
    const url = `${window.location.origin}/self-checkout/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ─── Computes conflict info for a station in the list ──────────────
  function getStationConflicts(station: SelfCheckoutStation): string[] {
    const conflicts: string[] = []
    if (posTerminalId && station.terminalId === posTerminalId) {
      conflicts.push('POS principal')
    }
    const otherStations = stations.filter((s) => s.id !== station.id)
    const sharedWith = otherStations
      .filter((s) => s.terminalId === station.terminalId)
      .map((s) => s.name)
    conflicts.push(...sharedWith)
    return conflicts
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-headline font-bold text-on-surface">Self-Checkout Stations</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Create stations and assign terminals for customer self-checkout
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Station
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Station Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Caja Principal"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Terminal ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTerminalId}
                    onChange={(e) => setNewTerminalId(e.target.value)}
                    placeholder="e.g. TERM001"
                    className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={listTerminals}
                    isLoading={listingTerminals}
                    type="button"
                  >
                    <Terminal className="h-4 w-4 mr-1.5" />
                    List
                  </Button>
                </div>

                {/* Terminal list with status */}
                {terminalInfos && terminalInfos.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                      Terminales disponibles
                    </p>
                    <div className="space-y-1">
                      {terminalInfos.map((t) => {
                        const { icon: Icon, color, label } = statusConfig[t.status]
                        const isSelected = newTerminalId === t.id
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTerminal(t)}
                            className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-outline-variant/50 bg-surface-container-high hover:border-outline'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary' : color}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono text-sm font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                    {t.id}
                                  </span>
                                  {t.status !== 'available' && (
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${color} ${color.includes('amber') ? 'bg-amber-400/10' : color.includes('error') ? 'bg-error/10' : ''}`}>
                                      {label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-on-surface-variant mt-0.5">
                                  {t.model} &middot; {t.operating_mode}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {terminalInfos && terminalInfos.length === 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-container/50 border border-outline-variant/50 px-3.5 py-3">
                    <Info className="h-4 w-4 text-on-surface-variant shrink-0" />
                    <p className="text-xs text-on-surface-variant">
                      No se encontraron terminales. Verifica tu Access Token en la pestaña POS.
                    </p>
                  </div>
                )}

                {/* Warning when typing manually */}
                {newTerminalId && !terminals?.some((t) => t.id === newTerminalId) && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-400">
                      Terminal no encontrada en la lista de MP. Verifica que el ID sea correcto.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Card provider
                </label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value as CardPaymentProviderName)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="mercado_pago">Mercado Pago Point</option>
                  <option value="clip">Clip PinPad</option>
                </select>
                <p className="text-[11px] text-on-surface-variant mt-1.5">
                  This station sends card payments to this provider&apos;s terminal.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={createStation} isLoading={creating} disabled={!newName.trim() || !newTerminalId.trim()}>
                  Create Station
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setNewName('')
                    setNewTerminalId('')
                    setNewProvider(getActiveCardProvider(store?.settings))
                    setTerminals(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stations.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 text-center">
          <Terminal className="mb-3 h-10 w-10 text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No self-checkout stations yet</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">Create one to generate a self-checkout URL</p>
        </div>
      )}

      <div className="space-y-3">
        {stations.map((station) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          const url = station.token ? `${origin}/self-checkout/${station.token}` : ''
          const conflicts = getStationConflicts(station)
          return (
            <Card key={station.id} className={station.isActive ? '' : 'opacity-50'}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-headline font-bold text-on-surface">{station.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        station.isActive ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {station.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Terminal className="h-3.5 w-3.5" />
                      <span className="font-mono">{station.terminalId}</span>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {cardProviderDisplayName(station.provider ?? 'mercado_pago')}
                      </span>
                    </div>

                    {/* Conflict indicators */}
                    {conflicts.length > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-400">
                          Misma terminal que: {conflicts.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {station.token && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyUrl(station.token!, station.id)}
                      >
                        {copiedId === station.id ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateToken(station.id)}
                      isLoading={regeneratingId === station.id}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStation(station.id)}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {url && (
                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-high/40 p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center justify-center rounded-xl bg-white p-2 shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(url)}`}
                        alt={`QR de acceso para ${station.name}`}
                        className="h-[104px] w-[104px]"
                      />
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 overflow-hidden">
                        <LinkIcon className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
                        <code className="block flex-1 min-w-0 truncate text-xs text-on-surface-variant font-mono">{url}</code>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Este QR abre el registro público de esta estación.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Confirmation: use occupied terminal ─────────────────────── */}
      <Modal open={confirmTerminal !== null} onOpenChange={(v) => { if (!v) setConfirmTerminal(null) }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Terminal en uso</ModalTitle>
            <ModalDescription>
              Esta terminal ya está asignada a: <strong>{confirmTerminal?.usedBy.join(', ')}</strong>.
              Usar la misma terminal puede causar conflictos con pagos simultáneos.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmTerminal(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmOccupiedTerminal}>
              Usar de todas formas
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
