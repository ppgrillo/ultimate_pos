import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Input } from './Input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('renders with error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input label="Name" />)

    const input = screen.getByLabelText('Name')
    await user.type(input, 'John')
    expect(input).toHaveValue('John')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Email" disabled />)
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })
})
