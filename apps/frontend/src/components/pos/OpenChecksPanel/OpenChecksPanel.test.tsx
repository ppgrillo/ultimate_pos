import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { OpenChecksPanel } from './OpenChecksPanel'

const mockRefetch = vi.fn()
const mockCloseAndPay = vi.fn()

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useGetChecksQuery: () => ({
      data: [
        {
          id: 'chk-1',
          table_number: 12,
          opened_at: new Date('2026-01-01T12:00:00Z').toISOString(),
          total: 450,
          has_active_kitchen: false,
        },
      ],
      isFetching: false,
      refetch: mockRefetch,
    }),
  }
})

describe('OpenChecksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders open table rows with totals', async () => {
    render(<OpenChecksPanel />)

    expect(screen.getByText('Open Tables')).toBeInTheDocument()
    expect(screen.getByText('Open Workspace')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expand open tables' }))
    expect(screen.getByText('Table 12')).toBeInTheDocument()
    expect(screen.getByText('$450.00')).toBeInTheDocument()
  })

  it('triggers close check action', async () => {
    render(<OpenChecksPanel onCloseAndPay={mockCloseAndPay} />)

    await userEvent.click(screen.getByRole('button', { name: 'Expand open tables' }))
    await userEvent.click(screen.getByText('Table 12'))
    await userEvent.click(screen.getByText('Close & Pay'))
    expect(mockCloseAndPay).toHaveBeenCalledWith(expect.objectContaining({ id: 'chk-1', table_number: 12, total: 450 }))
  })

  it('starts collapsed in compact mode and toggles table list', async () => {
    render(<OpenChecksPanel />)

    expect(screen.queryByText('Table 12')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expand open tables' }))
    expect(screen.getByText('Table 12')).toBeInTheDocument()
  })
})
