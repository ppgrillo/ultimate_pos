import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PointsInput } from './PointsInput'

describe('PointsInput', () => {
  it('renders with label', () => {
    render(<PointsInput value={10} onChange={vi.fn()} />)

    expect(screen.getByText('Points per Sale')).toBeInTheDocument()
    expect(screen.getByText('Points')).toBeInTheDocument()
  })

  it('displays current value', () => {
    render(<PointsInput value={10} onChange={vi.fn()} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(10)
  })

  it('calls onChange when value changes', async () => {
    const onChange = vi.fn()
    render(<PointsInput value={null} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await userEvent.type(input, '5')

    expect(onChange).toHaveBeenCalled()
  })

  it('renders empty when value is null', () => {
    render(<PointsInput value={null} onChange={vi.fn()} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(null)
  })
})
