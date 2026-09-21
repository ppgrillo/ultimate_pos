import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const createSupplier = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 's1' }) }))
const updateSupplier = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 's1' }) }))

vi.mock('@/store/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/api')>()
  return {
    ...actual,
    useCreateSupplierMutation: () => [createSupplier, { isLoading: false }],
    useUpdateSupplierMutation: () => [updateSupplier, { isLoading: false }],
  }
})

import { SupplierForm } from './SupplierForm'

const SUPPLIER = {
  id: 's1',
  store_id: 'store-1',
  name: 'Distribuidora Norte',
  contact_name: 'Ana Torres',
  phone: '+52 555 123 4567',
  email: 'ventas@distnorte.mx',
  website: 'https://distnorte.mx',
  address: 'Av. Reforma 123',
  notes: 'Textiles y uniformes',
  is_active: true,
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
}

const onOpenChange = vi.fn()

describe('SupplierForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the create form with empty fields', () => {
    render(<SupplierForm open onOpenChange={onOpenChange} />)
    expect(screen.getByText('New Supplier')).toBeInTheDocument()
    expect(screen.getByLabelText('Supplier name')).toHaveValue('')
  })

  it('validates that a name is required', async () => {
    const user = userEvent.setup()
    render(<SupplierForm open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Add Supplier' }))

    expect(await screen.findByText(/name is required/)).toBeInTheDocument()
    expect(createSupplier).not.toHaveBeenCalled()
  })

  it('validates the email format', async () => {
    const user = userEvent.setup()
    render(<SupplierForm open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('Supplier name'), 'Distribuidora Norte')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Add Supplier' }))

    expect(await screen.findByText(/valid email/)).toBeInTheDocument()
    expect(createSupplier).not.toHaveBeenCalled()
  })

  it('creates a supplier with normalized values', async () => {
    const user = userEvent.setup()
    render(<SupplierForm open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('Supplier name'), '  Distribuidora Norte  ')
    await user.type(screen.getByLabelText('Contact person'), 'Ana Torres')
    await user.type(screen.getByLabelText('Phone'), '+52 555 123 4567')
    await user.type(screen.getByLabelText('Email'), 'ventas@distnorte.mx')
    await user.type(screen.getByLabelText('Website'), 'https://distnorte.mx')
    await user.type(screen.getByLabelText('What they supply'), 'Textiles y uniformes')
    await user.click(screen.getByRole('button', { name: 'Add Supplier' }))

    await waitFor(() => {
      expect(createSupplier).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Distribuidora Norte',
          contact_name: 'Ana Torres',
          email: 'ventas@distnorte.mx',
          notes: 'Textiles y uniformes',
          is_active: true,
        }),
      )
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('hydrates fields when editing a supplier', async () => {
    render(<SupplierForm open onOpenChange={onOpenChange} supplier={SUPPLIER} />)
    expect(screen.getByText('Edit Supplier')).toBeInTheDocument()
    expect(screen.getByLabelText('Supplier name')).toHaveValue('Distribuidora Norte')
    expect(screen.getByLabelText('Email')).toHaveValue('ventas@distnorte.mx')
    expect(screen.getByLabelText('Address')).toHaveValue('Av. Reforma 123')
    expect(screen.getByLabelText('What they supply')).toHaveValue('Textiles y uniformes')
  })

  it('updates the supplier when edited', async () => {
    const user = userEvent.setup()
    render(<SupplierForm open onOpenChange={onOpenChange} supplier={SUPPLIER} />)

    await user.clear(screen.getByLabelText('Supplier name'))
    await user.type(screen.getByLabelText('Supplier name'), 'Distribuidora Norte S.A.')
    const activeToggle = screen.getByRole('checkbox', { name: /active supplier/i })
    await user.click(activeToggle)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(updateSupplier).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 's1',
          body: expect.objectContaining({ name: 'Distribuidora Norte S.A.', is_active: false }),
        }),
      )
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})