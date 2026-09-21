import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PhoneInput } from './PhoneInput'

describe('PhoneInput', () => {
  it('renders the label and a tel input with an international placeholder', () => {
    render(<PhoneInput label="Phone" />)
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel')
  })

  it('offers a broad list of world countries in the country select', () => {
    render(<PhoneInput label="Phone" />)
    const select = screen.getByRole('combobox', { name: /country/i })
    expect(select.querySelectorAll('option').length).toBeGreaterThan(30)
  })

  it('formats a stored E.164 value for display', () => {
    render(<PhoneInput label="Phone" value="+525551234567" defaultCountry="MX" />)
    expect(screen.getByLabelText('Phone')).toHaveValue('+52 55 5123 4567')
  })

  it('emits the E.164 number while typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PhoneInput label="Phone" onChange={onChange} defaultCountry="MX" />)

    await user.type(screen.getByLabelText('Phone'), '5551234567')

    expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^\+52\d{10}$/))
  })

  it('exposes an error message with an accessible description', () => {
    render(<PhoneInput label="Phone" error="Invalid number" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid number')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription('Invalid number')
  })
})