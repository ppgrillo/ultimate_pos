import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('renders current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onChange with decremented value on minus click', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={3} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('calls onChange with incremented value on plus click', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={3} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[1])
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('disables minus button at min value', () => {
    render(<QuantityStepper value={0} onChange={vi.fn()} min={0} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
  })

  it('disables plus button at max value', () => {
    render(<QuantityStepper value={99} onChange={vi.fn()} max={99} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toBeDisabled()
  })
})
