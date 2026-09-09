import { render, screen, fireEvent } from '@testing-library/react'
import { AutoPromoToggle } from './AutoPromoToggle'

describe('AutoPromoToggle', () => {
  it('toggles freely when no PIN is configured', () => {
    const onChange = vi.fn()
    render(<AutoPromoToggle enabled={true} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /promos automáticas activas/i }))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('toggles back on without asking for a PIN', () => {
    const onChange = vi.fn()
    render(<AutoPromoToggle enabled={false} onChange={onChange} promoPin="1234" />)

    fireEvent.click(screen.getByRole('button', { name: /promos automáticas pausadas/i }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('requests the PIN before pausing promotions', () => {
    const onChange = vi.fn()
    render(<AutoPromoToggle enabled={true} onChange={onChange} promoPin="1234" />)

    fireEvent.click(screen.getByRole('button', { name: /promos automáticas activas/i }))
    expect(screen.queryByText('Ingresa el código para pausar las promociones automáticas en esta venta')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText('Código incorrecto')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('toggles off when the PIN is correct', () => {
    const onChange = vi.fn()
    render(<AutoPromoToggle enabled={true} onChange={onChange} promoPin="1234" />)

    fireEvent.click(screen.getByRole('button', { name: /promos automáticas activas/i }))
    fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onChange).toHaveBeenCalledWith(false)
  })
})