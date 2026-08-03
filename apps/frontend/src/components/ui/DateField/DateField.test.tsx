import { render, screen, fireEvent } from '@testing-library/react'
import { DateField } from './DateField'

describe('DateField', () => {
  it('renders a labeled date input', () => {
    render(<DateField label="Start Date" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
  })

  it('emits the selected date', () => {
    const onChange = vi.fn()
    render(<DateField label="Start Date" value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-10' } })
    expect(onChange).toHaveBeenCalledWith('2026-08-10')
  })

  it('clears the value via the clear button', () => {
    const onChange = vi.fn()
    render(<DateField label="Start Date" value="2026-08-10" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Clear Start Date'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does not render a clear button when empty', () => {
    render(<DateField label="Start Date" value="" onChange={() => {}} />)
    expect(screen.queryByLabelText('Clear Start Date')).not.toBeInTheDocument()
  })
})
