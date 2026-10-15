import { useState } from 'react'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { TipSelector } from './TipSelector'

function Harness({ base, maxPercent }: { base: number; maxPercent: number }) {
  const [tip, setTip] = useState(0)
  return <TipSelector tip={tip} base={base} onChange={setTip} allowCustom maxPercent={maxPercent} />
}

describe('TipSelector', () => {
  it('renders the default presets and a no-tip option', () => {
    render(<TipSelector tip={0} base={100} onChange={vi.fn()} />)
    expect(screen.getByText('No tip')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByText('15%')).toBeInTheDocument()
    expect(screen.getByText('18%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('computes the tip amount from the bill when a preset is clicked', async () => {
    const onChange = vi.fn()
    render(<TipSelector tip={0} base={200} onChange={onChange} />)
    await userEvent.click(screen.getByText('15%'))
    expect(onChange).toHaveBeenCalledWith(30)
  })

  it('caps presets at the configured maximum percent', () => {
    render(<TipSelector tip={0} base={100} onChange={vi.fn()} maxPercent={20} />)
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.queryByText('25%')).not.toBeInTheDocument()
  })

  it('clears the tip when No tip is clicked', async () => {
    const onChange = vi.fn()
    render(<TipSelector tip={15} base={100} onChange={onChange} />)
    await userEvent.click(screen.getByText('No tip'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('shows a custom amount input only when custom is allowed', async () => {
    render(<TipSelector tip={0} base={100} onChange={vi.fn()} allowCustom />)
    expect(screen.queryByPlaceholderText('0.00')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Custom'))
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('clamps a custom amount to the maximum tip', async () => {
    render(<Harness base={100} maxPercent={20} />)
    await userEvent.click(screen.getByText('Custom'))
    await userEvent.type(screen.getByPlaceholderText('0.00'), '50')
    expect((screen.getByPlaceholderText('0.00') as HTMLInputElement).value).toBe('20')
  })
})
