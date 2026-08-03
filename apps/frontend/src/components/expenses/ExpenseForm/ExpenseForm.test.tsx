import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const createExpense = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'e1' }) }))
const updateExpense = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'e1' }) }))
const uploadReceipt = vi.fn(() => ({ unwrap: () => Promise.resolve({ url: 'https://cdn.test/receipts/r1.jpg' }) }))
const deleteReceipt = vi.fn(() => ({ unwrap: () => Promise.resolve({ success: true }) }))

vi.mock('@/store/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/api')>()
  return {
    ...actual,
    useCreateExpenseMutation: () => [createExpense, { isLoading: false }],
    useUpdateExpenseMutation: () => [updateExpense, { isLoading: false }],
    useUploadReceiptMutation: () => [uploadReceipt, { isLoading: false }],
    useDeleteReceiptMutation: () => [deleteReceipt, { isLoading: false }],
  }
})

vi.mock('@/lib/imageCompress', () => ({
  compressImage: vi.fn(async (file: File) => ({ file, url: 'blob:preview', bytes: 100, width: 0, height: 0 })),
}))

import { ExpenseForm } from './ExpenseForm'

const onOpenChange = vi.fn()

function renderForm() {
  return render(<ExpenseForm open onOpenChange={onOpenChange} />)
}

describe('ExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to Operating type with the first operating category', () => {
    renderForm()
    expect(screen.getByText('Record Expense')).toBeInTheDocument()
    expect(screen.getByText('Operating')).toBeInTheDocument()
    expect(screen.getByText('Compras / Inventario')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rent' })).toBeInTheDocument()
  })

  it('switches categories when changing type to inventory', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Compras / Inventario' }))

    expect(screen.getByRole('button', { name: 'Merchandise' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rent' })).not.toBeInTheDocument()
  })

  it('shows an error when saving without an amount', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Description'), 'July office rent')
    await user.click(screen.getByRole('button', { name: 'Save Expense' }))

    expect(await screen.findByText(/valid amount/)).toBeInTheDocument()
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('creates an expense with the form values', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Description'), 'July office rent')
    await user.type(screen.getByLabelText('Amount'), '1200.50')
    await user.click(screen.getByRole('button', { name: 'Save Expense' }))

    await waitFor(() => {
      expect(createExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operating',
          category: 'Rent',
          description: 'July office rent',
          amount: 1200.5,
        }),
      )
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uploads and attaches a receipt', async () => {
    const user = userEvent.setup()
    renderForm()

    const file = new File(['x'], 'receipt.png', { type: 'image/png' })
    const input = screen.getByLabelText(/receipt/i)
    await user.upload(input, file)

    await waitFor(() => {
      expect(uploadReceipt).toHaveBeenCalled()
      expect(screen.getByText(/Receipt uploaded/)).toBeInTheDocument()
    })
  })
})
