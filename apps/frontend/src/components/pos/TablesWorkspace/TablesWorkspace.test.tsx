import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { TablesWorkspace } from './TablesWorkspace'

const mockCloseCheck = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
const mockRefetch = vi.fn()

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useGetChecksQuery: () => ({
      data: [
        {
          id: 'chk-1',
          table_number: 8,
          opened_at: new Date('2026-01-01T12:00:00Z').toISOString(),
          total: 540,
          has_active_kitchen: false,
        },
      ],
      isFetching: false,
      refetch: mockRefetch,
    }),
    useGetCheckByIdQuery: () => ({
      data: {
        id: 'chk-1',
        orders: [
          {
            id: 'ord-1',
            round_number: 1,
            status: 'served',
            total: 540,
            notes: null,
            items: [
              { id: 'i1', quantity: 2, product_name: 'Latte', unit_price: 120 },
            ],
          },
        ],
      },
      isFetching: false,
    }),
    useCloseCheckMutation: () => [mockCloseCheck, { isLoading: false }],
  }
})

describe('TablesWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders workspace metrics and table row', () => {
    render(<TablesWorkspace />)
    expect(screen.getByText('Tables Workspace')).toBeInTheDocument()
    expect(screen.getByText('Table 8')).toBeInTheDocument()
    expect(screen.getAllByText('$540.00')).toHaveLength(2)
  })

  it('opens detail accordion and shows item rows', async () => {
    render(<TablesWorkspace />)
    await userEvent.click(screen.getByText('Table 8'))
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
  })
})
