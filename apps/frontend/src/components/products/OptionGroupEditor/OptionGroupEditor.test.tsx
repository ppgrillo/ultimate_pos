import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OptionGroupEditor } from './OptionGroupEditor'
import type { ModifierGroup } from '@ultimate-pos/shared'

const defaultGroups: ModifierGroup[] = [
  {
    name: 'Milk Choice',
    type: 'single',
    is_required: true,
    sort_order: 0,
    options: [
      { name: 'Whole Milk', price_adjustment: 0, sort_order: 0 },
      { name: 'Oat Milk', price_adjustment: 0.5, sort_order: 1 },
    ],
  },
]

describe('OptionGroupEditor', () => {
  it('renders groups with options', () => {
    render(<OptionGroupEditor groups={defaultGroups} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Milk Choice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Whole Milk')).toBeInTheDocument()
  })

  it('adds a new empty group', async () => {
    const onChange = vi.fn()
    render(<OptionGroupEditor groups={[]} onChange={onChange} />)

    await userEvent.click(screen.getByText('New Group'))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: '', type: 'single', options: [] }),
    ])
  })

  it('adds an option to a group', async () => {
    const onChange = vi.fn()
    render(<OptionGroupEditor groups={defaultGroups} onChange={onChange} />)

    const addButtons = screen.getAllByText('Add Option')
    await userEvent.click(addButtons[0])

    const updatedGroups = onChange.mock.calls[0][0]
    expect(updatedGroups[0].options).toHaveLength(3)
  })

  it('toggles multi-select checkbox', async () => {
    const onChange = vi.fn()
    render(<OptionGroupEditor groups={defaultGroups} onChange={onChange} />)

    const checkbox = screen.getByLabelText('Multi-select')
    await userEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'multi' }),
    ])
  })

  it('shows empty state message', () => {
    render(<OptionGroupEditor groups={[]} onChange={vi.fn()} />)

    expect(
      screen.getByText(/No modifier groups/),
    ).toBeInTheDocument()
  })

  it('updates group name', async () => {
    const onChange = vi.fn()
    render(<OptionGroupEditor groups={defaultGroups} onChange={onChange} />)

    const input = screen.getByDisplayValue('Milk Choice')
    await userEvent.clear(input)
    await userEvent.type(input, 'Size')

    expect(onChange).toHaveBeenCalled()
  })

  it('updates option name', async () => {
    const onChange = vi.fn()
    render(<OptionGroupEditor groups={defaultGroups} onChange={onChange} />)

    const input = screen.getByDisplayValue('Whole Milk')
    await userEvent.clear(input)
    await userEvent.type(input, 'Soy Milk')

    expect(onChange).toHaveBeenCalled()
  })
})
