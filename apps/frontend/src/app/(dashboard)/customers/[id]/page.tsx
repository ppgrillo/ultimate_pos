'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchCustomerById,
  fetchCustomerOrders,
  fetchCommunicationLog,
  addCommunication,
  updateCustomer,
} from '@/store/slices/customersSlice'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Phone, Mail, Calendar, Hash, ShoppingBag, MessageCircle, Star, History, Edit3 } from 'lucide-react'

type Tab = 'info' | 'orders' | 'communication' | 'preferences'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const id = params.id as string
  const customer = useAppSelector((s) => s.customers.selectedCustomer)
  const orders = useAppSelector((s) => s.customers.customerOrders)
  const commLog = useAppSelector((s) => s.customers.communicationLog)
  const isLoadingOrders = useAppSelector((s) => s.customers.isLoadingOrders)
  const preferenceFields = useAppSelector((s) => s.storeConfig.currentStore?.settings?.preferenceFields ?? [])

  const [tab, setTab] = useState<Tab>('info')
  const [showContact, setShowContact] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [contactForm, setContactForm] = useState({ type: 'note', subject: '', message: '' })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    tags: '',
    source: '',
    preferred_contact: '',
    birthday: '',
    preferences: '{}',
    social_handles: '{}',
  })

  useEffect(() => {
    dispatch(fetchCustomerById(id))
  }, [dispatch, id])

  useEffect(() => {
    if (tab === 'orders') dispatch(fetchCustomerOrders({ id }))
    if (tab === 'communication') dispatch(fetchCommunicationLog(id))
  }, [dispatch, id, tab])

  useEffect(() => {
    if (customer) {
      setEditForm({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        notes: customer.notes || '',
        tags: (customer.tags || []).join(', '),
        source: customer.source || '',
        preferred_contact: customer.preferred_contact || '',
        birthday: customer.birthday || '',
        preferences: JSON.stringify(customer.preferences || {}, null, 2),
        social_handles: JSON.stringify(customer.social_handles || {}, null, 2),
      })
    }
  }, [customer])

  const handleAddContact = async () => {
    if (!contactForm.type) return
    await dispatch(addCommunication({
      customerId: id,
      type: contactForm.type,
      subject: contactForm.subject || undefined,
      message: contactForm.message || undefined,
    }))
    setContactForm({ type: 'note', subject: '', message: '' })
    setShowContact(false)
    dispatch(fetchCommunicationLog(id))
  }

  const handleEditSave = async () => {
    if (!customer) return
    const payload: any = {
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      notes: editForm.notes || null,
      tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      source: editForm.source || null,
      preferred_contact: editForm.preferred_contact || null,
      birthday: editForm.birthday || null,
    }
    try { payload.preferences = JSON.parse(editForm.preferences) } catch {}
    try { payload.social_handles = JSON.parse(editForm.social_handles) } catch {}
    await dispatch(updateCustomer({ id, ...payload }))
    setShowEdit(false)
    dispatch(fetchCustomerById(id))
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">Loading customer...</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'preferences', label: 'Preferences' },
    { key: 'orders', label: `Orders (${customer.total_visits})` },
    { key: 'communication', label: `Contact (${commLog.length})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/customers')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest text-lg font-headline font-bold text-on-surface">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-headline text-headline-lg text-on-surface">{customer.name}</h1>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                {customer.email && <span>{customer.email}</span>}
                {customer.email && customer.phone && <span>·</span>}
                {customer.phone && <span>{customer.phone}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => setShowContact(true)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Log Contact
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="text-center">
            <Star className="h-5 w-5 text-primary mx-auto mb-1" />
            <CardTitle className="text-xl">{customer.loyalty?.points || 0}</CardTitle>
            <CardDescription>Points</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <Hash className="h-5 w-5 text-secondary mx-auto mb-1" />
            <CardTitle className="text-xl">{customer.total_visits}</CardTitle>
            <CardDescription>Visits</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <ShoppingBag className="h-5 w-5 text-tertiary mx-auto mb-1" />
            <CardTitle className="text-xl">{formatCurrency(customer.total_spent)}</CardTitle>
            <CardDescription>Total Spent</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <History className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <CardTitle className="text-xl">
              {customer.total_spent > 0 && customer.total_visits > 0
                ? formatCurrency(customer.total_spent / customer.total_visits)
                : formatCurrency(0)}
            </CardTitle>
            <CardDescription>Avg / Visit</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-outline-variant">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-label font-bold transition-colors border-b-2 -mb-[1px] ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-on-surface-variant" />
                <span className="text-on-surface">{customer.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-on-surface-variant" />
                <span className="text-on-surface">{customer.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-on-surface-variant" />
                <span className="text-on-surface">{customer.birthday || '—'}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Source</span>
                <span className="text-on-surface font-label font-bold">{customer.source || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Preferred Contact</span>
                <span className="text-on-surface font-label font-bold capitalize">{customer.preferred_contact || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Customer Since</span>
                <span className="text-on-surface font-label font-bold">{new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Last Contacted</span>
                <span className="text-on-surface font-label font-bold">
                  {customer.last_contacted_at
                    ? new Date(customer.last_contacted_at).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(customer.tags || []).length === 0 ? (
                  <span className="text-sm text-on-surface-variant">No tags</span>
                ) : (
                  (customer.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-label font-bold text-on-surface-variant">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          {customer.social_handles && Object.keys(customer.social_handles).length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Social Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(customer.social_handles).map(([platform, handle]) => (
                    <div key={platform} className="flex items-center gap-3 text-sm">
                      <span className="text-on-surface-variant font-label font-bold capitalize">{platform}</span>
                      <span className="text-on-surface">{handle as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {customer.notes && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              {preferenceFields.length === 0
                ? 'No preference fields configured. Go to Settings > Store to add them.'
                : 'Customer preferences based on your store configuration.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preferenceFields.length === 0 ? (
              <div className="space-y-4">
                {Object.keys(customer.preferences || {}).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(customer.preferences).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-on-surface-variant capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-on-surface font-label font-bold">{Array.isArray(val) ? (val as string[]).join(', ') : String(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No preferences recorded.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {preferenceFields.map((field) => {
                  const val = (customer.preferences || {})[field.key]
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">{field.label}</label>
                      <div className="text-sm text-on-surface">
                        {field.type === 'multiselect' && Array.isArray(val)
                          ? (val as string[]).map((v: string) => (
                              <span key={v} className="inline-block rounded-full bg-surface-container-high px-3 py-1 text-xs font-label font-bold mr-1.5 mb-1">{v}</span>
                            ))
                          : val
                            ? String(val)
                            : <span className="text-on-surface-variant">Not set</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingOrders ? (
              <div className="p-8 text-center text-on-surface-variant">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order: any) => (
                      <tr key={order.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/50 transition-colors">
                        <td className="px-4 py-3 font-label font-bold text-sm text-on-surface">#{order.order_number}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{(order.items || []).length} items</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-label font-bold text-on-surface-variant capitalize">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-label font-bold text-sm text-on-surface">{formatCurrency(Number(order.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'communication' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Communication Log</CardTitle>
              <CardDescription>History of messages, calls, and notes</CardDescription>
            </div>
            <Button onClick={() => setShowContact(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Log Contact
            </Button>
          </CardHeader>
          <CardContent>
            {commLog.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">No communication logged yet.</p>
            ) : (
              <div className="space-y-3">
                {commLog.map((log) => (
                  <div key={log.id} className="rounded-xl bg-surface-container/50 border border-outline-variant/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider ${
                        log.type === 'call' ? 'bg-green-500/20 text-green-400' :
                        log.type === 'sms' ? 'bg-blue-500/20 text-blue-400' :
                        log.type === 'email' ? 'bg-purple-500/20 text-purple-400' :
                        log.type === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.subject && <p className="text-sm font-label font-bold text-on-surface mb-1">{log.subject}</p>}
                    {log.message && <p className="text-sm text-on-surface-variant">{log.message}</p>}
                    {log.response && (
                      <div className="mt-2 pt-2 border-t border-outline-variant/50">
                        <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">Response</span>
                        <p className="text-sm text-on-surface mt-0.5">{log.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showContact} onOpenChange={setShowContact}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Log Contact</ModalTitle>
            <ModalDescription>Record a touchpoint with this customer.</ModalDescription>
          </ModalHeader>
          <div className="space-y-4 px-6 py-4">
            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Type</label>
              <select
                value={contactForm.type}
                onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}
                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="note">Note</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="call">Call</option>
              </select>
            </div>
            <Input
              label="Subject"
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              placeholder="Brief subject"
            />
            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Message</label>
              <textarea
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="What was discussed?"
                rows={3}
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowContact(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>Log Entry</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={showEdit} onOpenChange={setShowEdit}>
        <ModalContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>Edit Customer</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 px-6 py-4">
            <Input label="Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Source</label>
                <select value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                  <option value="">Select...</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="referral">Referral</option>
                  <option value="walk-in">Walk-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Preferred Contact</label>
                <select value={editForm.preferred_contact} onChange={(e) => setEditForm({ ...editForm, preferred_contact: e.target.value })} className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                  <option value="">Select...</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="dm">DM</option>
                </select>
              </div>
            </div>
            <Input label="Birthday" type="date" value={editForm.birthday} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} />
            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Tags <span className="text-on-surface-variant/50">(comma separated)</span></label>
              <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
