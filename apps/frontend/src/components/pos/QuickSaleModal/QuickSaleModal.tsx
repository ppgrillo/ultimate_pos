'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal'
import { useAppDispatch } from '@/store/hooks'
import { addItem } from '@/store/slices/cartSlice'

import { formatCurrency } from '@/lib/utils'
import { Calculator, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function evaluate(expr: string): number {
  try {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/')
    return Function(`"use strict"; return (${sanitized})`)()
  } catch {
    return NaN
  }
}

export function QuickSaleModal({ open, onOpenChange }: QuickSaleModalProps) {
  const dispatch = useAppDispatch()
  const inputRef = useRef<HTMLInputElement>(null)

  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [hasResult, setHasResult] = useState(false)
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [customPoints, setCustomPoints] = useState(0)

  useEffect(() => {
    if (open) {
      resetCalculator()
      setItemName('')
      setQuantity(1)
      setCustomPoints(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const resetCalculator = () => {
    setDisplay('0')
    setExpression('')
    setCurrentValue('')
    setPreviousValue(null)
    setOperation(null)
    setHasResult(false)
  }

  const appendNumber = useCallback((num: string) => {
    if (hasResult) {
      setCurrentValue(num)
      setDisplay(num)
      setExpression('')
      setHasResult(false)
      return
    }
    const newValue = currentValue === '' ? num : currentValue + num
    setCurrentValue(newValue)
    setDisplay(newValue)
  }, [currentValue, hasResult])

  const appendDecimal = useCallback(() => {
    if (hasResult) {
      setCurrentValue('0.')
      setDisplay('0.')
      setExpression('')
      setHasResult(false)
      return
    }
    if (!currentValue.includes('.')) {
      const newValue = currentValue === '' ? '0.' : currentValue + '.'
      setCurrentValue(newValue)
      setDisplay(newValue)
    }
  }, [currentValue, hasResult])

  const handleOperation = useCallback((op: string) => {
    const current = currentValue === '' ? previousValue ?? 0 : parseFloat(currentValue)

    if (previousValue !== null && operation && currentValue !== '') {
      const expr = `${previousValue} ${operation} ${currentValue}`
      const result = evaluate(expr)
      if (!isNaN(result)) {
        const rounded = Math.round(result * 1000000) / 1000000
        setPreviousValue(rounded)
        setDisplay(String(rounded))
        setExpression(`${formatNumber(previousValue)} ${operation} ${formatNumber(parseFloat(currentValue))} =`)
      }
    } else if (currentValue !== '') {
      setPreviousValue(current)
      setExpression(`${formatNumber(current)} ${op}`)
    } else if (previousValue !== null) {
      setExpression(`${formatNumber(previousValue)} ${op}`)
    }

    setOperation(op)
    setCurrentValue('')
    setHasResult(false)
  }, [currentValue, previousValue, operation])

  const calculateResult = useCallback(() => {
    const current = currentValue === '' ? previousValue ?? 0 : parseFloat(currentValue)

    if (previousValue !== null && operation) {
      const expr = `${previousValue} ${operation} ${current}`
      const result = evaluate(expr)
      if (!isNaN(result)) {
        const rounded = Math.round(result * 1000000) / 1000000
        setDisplay(String(rounded))
        setExpression(`${formatNumber(previousValue)} ${operation} ${formatNumber(current)} =`)
        setCurrentValue(String(rounded))
        setPreviousValue(null)
        setOperation(null)
        setHasResult(true)
      }
    }
  }, [currentValue, previousValue, operation])

  const backspace = useCallback(() => {
    if (hasResult) {
      resetCalculator()
      return
    }
    if (currentValue.length > 0) {
      const newValue = currentValue.slice(0, -1)
      setCurrentValue(newValue)
      setDisplay(newValue || '0')
    }
  }, [currentValue, hasResult])

  const clear = useCallback(() => {
    resetCalculator()
  }, [])

  const toggleSign = useCallback(() => {
    const current = currentValue === '' ? previousValue ?? 0 : parseFloat(currentValue)
    const negated = -current
    setCurrentValue(String(negated))
    setDisplay(String(negated))
    if (previousValue !== null && operation) {
      setPreviousValue(negated)
    }
  }, [currentValue, previousValue, operation])

  const percent = useCallback(() => {
    const current = currentValue === '' ? previousValue ?? 0 : parseFloat(currentValue)
    const divided = current / 100
    setCurrentValue(String(divided))
    setDisplay(String(divided))
  }, [currentValue, previousValue])

  const result = currentValue === '' ? (previousValue ?? 0) : parseFloat(currentValue)
  const totalPrice = isNaN(result) ? 0 : Math.round(result * 100) / 100

  const handleAddToCart = () => {
    const name = itemName.trim()
    if (!name || totalPrice <= 0) return

    dispatch(addItem({
      product_id: null,
      name,
      price: totalPrice,
      original_price: totalPrice,
      quantity,
      variant_label: '',
      modifiers: [],
      notes: null,
      is_custom: true,
      points: customPoints || 0,
    }))
    onOpenChange(false)
  }

  const quantityLabel = quantity > 1 ? ` (${quantity})` : ''

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quick Sale
          </ModalTitle>
          <ModalDescription>
            Calculate and add a custom item to the cart
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-surface-container-high border border-outline-variant p-3">
            {expression && (
              <div className="text-xs text-on-surface-variant/60 text-right font-mono mb-1 truncate">
                {expression}
              </div>
            )}
            <div className="text-right font-headline font-bold text-2xl text-on-surface tabular-nums truncate">
              {display}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block">
              <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Item Concept
              </span>
              <input
                ref={inputRef}
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Corte de pelo, Lavado de auto..."
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-high px-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </label>

            <label className="block">
              <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Quantity
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center font-headline font-bold text-lg text-on-surface tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Points
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomPoints(Math.max(0, customPoints - 1))}
                  disabled={customPoints <= 0}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center font-headline font-bold text-lg text-on-surface tabular-nums bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setCustomPoints(customPoints + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button onClick={clear} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-error/15 text-error font-label font-bold text-sm hover:bg-error/25 transition-colors">
              C
            </button>
            <button onClick={toggleSign} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant font-label font-bold text-sm hover:bg-surface-container transition-colors">
              +/-
            </button>
            <button onClick={percent} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant font-label font-bold text-sm hover:bg-surface-container transition-colors">
              %
            </button>
            <button onClick={() => handleOperation('÷')} className={cn("col-span-1 flex h-12 items-center justify-center rounded-lg font-label font-bold text-lg transition-colors", operation === '÷' ? 'bg-primary text-primary-on' : 'bg-surface-container-high text-on-surface hover:bg-surface-container')}>
              ÷
            </button>

            {['7', '8', '9'].map((n) => (
              <button key={n} onClick={() => appendNumber(n)} className="flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-lg hover:bg-surface-container transition-colors">
                {n}
              </button>
            ))}
            <button onClick={() => handleOperation('×')} className={cn("flex h-12 items-center justify-center rounded-lg font-label font-bold text-lg transition-colors", operation === '×' ? 'bg-primary text-primary-on' : 'bg-surface-container-high text-on-surface hover:bg-surface-container')}>
              ×
            </button>

            {['4', '5', '6'].map((n) => (
              <button key={n} onClick={() => appendNumber(n)} className="flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-lg hover:bg-surface-container transition-colors">
                {n}
              </button>
            ))}
            <button onClick={() => handleOperation('-')} className={cn("flex h-12 items-center justify-center rounded-lg font-label font-bold text-lg transition-colors", operation === '-' ? 'bg-primary text-primary-on' : 'bg-surface-container-high text-on-surface hover:bg-surface-container')}>
              -
            </button>

            {['1', '2', '3'].map((n) => (
              <button key={n} onClick={() => appendNumber(n)} className="flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-lg hover:bg-surface-container transition-colors">
                {n}
              </button>
            ))}
            <button onClick={() => handleOperation('+')} className={cn("flex h-12 items-center justify-center rounded-lg font-label font-bold text-lg transition-colors", operation === '+' ? 'bg-primary text-primary-on' : 'bg-surface-container-high text-on-surface hover:bg-surface-container')}>
              +
            </button>

            <button onClick={() => appendNumber('0')} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-lg hover:bg-surface-container transition-colors">
              0
            </button>
            <button onClick={appendDecimal} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-lg hover:bg-surface-container transition-colors">
              .
            </button>
            <button onClick={backspace} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface font-label font-bold text-sm hover:bg-surface-container transition-colors">
              ⌫
            </button>
            <button onClick={calculateResult} className="col-span-1 flex h-12 items-center justify-center rounded-lg bg-primary text-primary-on font-headline font-bold text-lg hover:bg-primary/90 transition-colors">
              =
            </button>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!itemName.trim() || totalPrice <= 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Calculator className="h-5 w-5" />
          {itemName.trim()
            ? `Add "${itemName.trim()}"${quantityLabel} — ${formatCurrency(totalPrice * quantity)}`
            : 'Enter an item concept'}
        </button>
      </ModalContent>
    </Modal>
  )
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 1000000) / 1000000)
}
