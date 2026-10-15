import { describe, expect, it } from 'vitest'
import { formatQuantity, snapToStep } from './quantity'

describe('formatQuantity', () => {
  it('renders integers without decimals', () => {
    expect(formatQuantity(3)).toBe('3')
    expect(formatQuantity(3.0)).toBe('3')
  })

  it('renders fractional quantities up to 3 decimals without trailing zeros', () => {
    expect(formatQuantity(1.5)).toBe('1.5')
    expect(formatQuantity(1.5)).toBe('1.5')
    expect(formatQuantity(0.125)).toBe('0.125')
  })

  it('appends the unit label when provided', () => {
    expect(formatQuantity(1.5, 'kg')).toBe('1.5 kg')
    expect(formatQuantity(2, 'L')).toBe('2 L')
  })

  it('ignores empty or null units', () => {
    expect(formatQuantity(2, null)).toBe('2')
    expect(formatQuantity(2, '  ')).toBe('2')
  })

  it('rounds to 3 decimals to match the DB column', () => {
    expect(formatQuantity(1.23456)).toBe('1.235')
  })
})

describe('snapToStep', () => {
  it('snaps to the nearest step', () => {
    expect(snapToStep(1.24, 0.1)).toBe(1.2)
    expect(snapToStep(1.26, 0.1)).toBe(1.3)
    expect(snapToStep(0.37, 0.25)).toBe(0.25)
    expect(snapToStep(0.4, 0.25)).toBe(0.5)
  })

  it('falls back to 3-decimal rounding when step is missing or invalid', () => {
    expect(snapToStep(1.23456, null)).toBe(1.235)
    expect(snapToStep(1.23456, 0)).toBe(1.235)
    expect(snapToStep(1.23456)).toBe(1.235)
  })

  it('returns 0 for non-finite input', () => {
    expect(snapToStep(Number.NaN, 0.1)).toBe(0)
    expect(snapToStep(Number.POSITIVE_INFINITY, 0.1)).toBe(0)
  })
})
