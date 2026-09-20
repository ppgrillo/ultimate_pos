import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import SimulationsPage from './page'

describe('SimulationsPage', () => {
  it('shows an empty state when there are no products', async () => {
    render(<SimulationsPage />)
    expect(await screen.findByText('No sellable products yet')).toBeInTheDocument()
  })
})