import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { fireEvent } from '@testing-library/react'
import { DEFAULT_PARAMS } from '@/lib/simulaciones/calculations'
import { EventParams } from './EventParams'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  ;(globalThis as any).ResizeObserver = ResizeObserverStub
  ;(globalThis as any).Element.prototype.scrollIntoView = () => {}
  ;(globalThis as any).Element.prototype.hasPointerCapture = () => false
  ;(globalThis as any).Element.prototype.setPointerCapture = () => {}
  ;(globalThis as any).Element.prototype.releasePointerCapture = () => {}
})

describe('EventParams', () => {
  it('renders the core controls', () => {
    const onChange = vi.fn()
    render(
      <EventParams
        params={DEFAULT_PARAMS}
        onChange={onChange}
        estimatedCount={0}
        avgMarginPercent={null}
        realCostCount={0}
      />,
    )

    expect(screen.getByLabelText('Event cost (fee)')).toBeInTheDocument()
    expect(screen.getByLabelText('Extra expenses')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Estimate costs at/ })).toBeInTheDocument()
  })

  it('updates the event cost from an input', () => {
    const onChange = vi.fn()
    render(
      <EventParams
        params={DEFAULT_PARAMS}
        onChange={onChange}
        estimatedCount={0}
        avgMarginPercent={null}
        realCostCount={0}
      />,
    )

    fireEvent.change(screen.getByLabelText('Event cost (fee)'), { target: { value: '25000' } })
    expect(onChange).toHaveBeenCalledWith({ eventCost: 25000 })
  })

  it('does not show hardcoded fee presets', () => {
    const onChange = vi.fn()
    render(
      <EventParams
        params={DEFAULT_PARAMS}
        onChange={onChange}
        estimatedCount={0}
        avgMarginPercent={null}
        realCostCount={0}
      />,
    )

    expect(screen.queryByText('Typical $12,000')).not.toBeInTheDocument()
    expect(screen.queryByText('Premium $50,000')).not.toBeInTheDocument()
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })

  it('picks the real average margin from the dropdown', async () => {
    const onChange = vi.fn()
    const { userEvent } = await import('@testing-library/user-event')
    render(
      <EventParams
        params={{ ...DEFAULT_PARAMS, marginPercent: 40 }}
        onChange={onChange}
        estimatedCount={1}
        avgMarginPercent={45}
        realCostCount={7}
      />,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /Estimate costs at/ }))
    await userEvent.click(await screen.findByText('My average (45%)'))
    expect(onChange).toHaveBeenCalledWith({ marginPercent: 45 })
  })

  it('sets a fixed margin from a preset', async () => {
    const onChange = vi.fn()
    const { userEvent } = await import('@testing-library/user-event')
    render(
      <EventParams
        params={{ ...DEFAULT_PARAMS, marginPercent: 45 }}
        onChange={onChange}
        estimatedCount={1}
        avgMarginPercent={45}
        realCostCount={7}
      />,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /Estimate costs at/ }))
    await userEvent.click(await screen.findByText('60%'))
    expect(onChange).toHaveBeenCalledWith({ marginPercent: 60 })
  })

  it('shows the real average and the estimated-count note', () => {
    const onChange = vi.fn()
    render(
      <EventParams
        params={DEFAULT_PARAMS}
        onChange={onChange}
        estimatedCount={1}
        avgMarginPercent={45}
        realCostCount={7}
      />,
    )

    expect(screen.getByText(/Your average:/)).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText(/1 product without a recorded cost/)).toBeInTheDocument()
  })
})