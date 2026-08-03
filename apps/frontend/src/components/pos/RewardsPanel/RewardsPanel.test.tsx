import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { RewardsPanel } from './RewardsPanel'
import type { LoyaltyReward } from '@ultimate-pos/shared'

const mockApiGet = vi.fn()

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
  },
}))

const rewards: LoyaltyReward[] = [
  {
    id: 'r1',
    store_id: 's1',
    name: 'Free Coffee',
    description: null,
    reward_type: 'free_product',
    points_required: 100,
    product_id: 'p1',
    discount_value: null,
    discount_type: null,
    metadata: {},
    is_active: true,
    max_uses: null,
    current_uses: 0,
    starts_at: null,
    ends_at: null,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r2',
    store_id: 's1',
    name: '10% Off',
    description: null,
    reward_type: 'percentage_discount',
    points_required: 50,
    product_id: null,
    discount_value: 10,
    discount_type: 'percentage',
    metadata: {},
    is_active: true,
    max_uses: null,
    current_uses: 0,
    starts_at: null,
    ends_at: null,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const defaultPreload = {
  cart: {
    items: [],
    customer_id: 'c1',
    customer_name: 'Test Customer',
    customer_tier: null,
    customer_points: 0,
    customer_loyalty_card_id: 'card1',
    table_number: null,
    order_type: 'dine-in' as const,
    discount: 0,
    notes: null,
    discount_label: null,
    redeemed_points: 0,
    appliedPromotions: [],
    promoDiscount: 0,
    redeemed_reward_id: null,
    redeemed_reward_data: null,
  },
}

describe('RewardsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue({ data: rewards })
  })

  it('fetches and lists the available rewards', async () => {
    render(<RewardsPanel cardId="card1" points={200} />, { preloadedState: defaultPreload })

    expect(await screen.findByText('Free Coffee')).toBeInTheDocument()
    expect(screen.getByText('10% Off')).toBeInTheDocument()
    expect(mockApiGet).toHaveBeenCalledWith('/rewards/available/card1')
  })

  it('shows the empty state when no rewards are available', async () => {
    mockApiGet.mockResolvedValue({ data: [] })

    render(<RewardsPanel cardId="card1" points={200} />, { preloadedState: defaultPreload })

    expect(await screen.findByText('No rewards available')).toBeInTheDocument()
  })

  it('disables rewards the customer cannot afford', async () => {
    render(<RewardsPanel cardId="card1" points={50} />, { preloadedState: defaultPreload })

    const freeCoffee = await screen.findByText('Free Coffee')
    expect(freeCoffee.closest('button')).toBeDisabled()
    expect(screen.getByText('10% Off').closest('button')).toBeEnabled()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('collapses the list into a selected chip after choosing a reward', async () => {
    render(<RewardsPanel cardId="card1" points={200} />, { preloadedState: defaultPreload })

    await userEvent.click(await screen.findByText('10% Off'))

    expect(screen.queryByText('Free Coffee')).not.toBeInTheDocument()
    expect(screen.getByText('10% Off')).toBeInTheDocument()
  })

  it('restores the full list when the selected chip is removed', async () => {
    render(<RewardsPanel cardId="card1" points={200} />, {
      preloadedState: {
        ...defaultPreload,
        cart: {
          ...defaultPreload.cart,
          redeemed_reward_id: 'r2',
          redeemed_reward_data: {
            name: '10% Off',
            reward_type: 'percentage_discount',
            points_required: 50,
            discount_value: 10,
            discount_type: 'percentage' as const,
          },
        },
      },
    })

    const chip = await screen.findByText('10% Off')
    await userEvent.click(chip)

    expect(await screen.findByText('Free Coffee')).toBeInTheDocument()
  })

  it('works in controlled mode without fetching', async () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <RewardsPanel
        points={200}
        rewards={rewards}
        selectedRewardId={null}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />,
      { preloadedState: defaultPreload },
    )

    expect(screen.getByText('Free Coffee')).toBeInTheDocument()
    expect(screen.getByText('10% Off')).toBeInTheDocument()
    expect(mockApiGet).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('10% Off'))
    expect(onSelect).toHaveBeenCalledWith(rewards[1])
    expect(onDeselect).not.toHaveBeenCalled()
  })

  it('shows a selected chip and hides the list in controlled mode', async () => {
    const onDeselect = vi.fn()

    render(
      <RewardsPanel
        points={200}
        rewards={rewards}
        selectedRewardId="r2"
        onSelect={() => {}}
        onDeselect={onDeselect}
      />,
      { preloadedState: defaultPreload },
    )

    expect(screen.getByText('10% Off')).toBeInTheDocument()
    expect(screen.queryByText('Free Coffee')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('10% Off'))
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })
})
