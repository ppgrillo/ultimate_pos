import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { BulkQuantityModal } from './BulkQuantityModal'
import type { Product } from '@ultimate-pos/shared'

const bulkProduct = {
  id: 'apples',
  name: 'Apples',
  price: 2.5,
  is_bulk: true,
  bulk_unit: 'kg',
  bulk_step: 0.5,
  image_url: null,
  modifiers: [],
} as unknown as Product

describe('self-checkout BulkQuantityModal', () => {
  it('confirms the snapped quantity', async () => {
    const onConfirm = vi.fn()
    render(
      <BulkQuantityModal
        product={bulkProduct}
        promotion={null}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '1 kg' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))
    expect(onConfirm).toHaveBeenCalledWith(1)
  })

  it('starts at 0 with Add to Cart disabled', () => {
    render(
      <BulkQuantityModal
        product={bulkProduct}
        promotion={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeDisabled()
  })

  it('uses a quick amount chip', async () => {
    const onConfirm = vi.fn()
    render(
      <BulkQuantityModal
        product={bulkProduct}
        promotion={null}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '0.5 kg' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))
    expect(onConfirm).toHaveBeenCalledWith(0.5)
  })

  it('calls onClose on cancel', async () => {
    const onClose = vi.fn()
    render(
      <BulkQuantityModal
        product={bulkProduct}
        promotion={null}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders the price per unit', () => {
    render(
      <BulkQuantityModal
        product={bulkProduct}
        promotion={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('$2.50 / kg')).toBeInTheDocument()
  })
})
