'use client'

import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModifierGroup, ModifierOption } from '@ultimate-pos/shared'

interface OptionGroupEditorProps {
  groups: ModifierGroup[]
  onChange: (groups: ModifierGroup[]) => void
  className?: string
}

function createOption(name = '', price = 0): ModifierOption {
  return { name, price_adjustment: price, sort_order: 0 }
}

function createGroup(): ModifierGroup {
  return {
    name: '',
    type: 'single',
    is_required: false,
    sort_order: 0,
    options: [],
  }
}

export function OptionGroupEditor({ groups, onChange, className }: OptionGroupEditorProps) {
  const updateGroup = (index: number, patch: Partial<ModifierGroup>) => {
    const next = groups.map((g, i) => (i === index ? { ...g, ...patch } : g))
    onChange(next)
  }

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index))
  }

  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= groups.length) return
    const next = [...groups]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addGroup = () => {
    onChange([...groups, createGroup()])
  }

  const addOption = (groupIndex: number) => {
    const group = groups[groupIndex]
    const option = createOption()
    option.sort_order = group.options.length
    updateGroup(groupIndex, { options: [...group.options, option] })
  }

  const updateOption = (groupIndex: number, optionIndex: number, patch: Partial<ModifierOption>) => {
    const group = groups[groupIndex]
    const options = group.options.map((o, i) => (i === optionIndex ? { ...o, ...patch } : o))
    updateGroup(groupIndex, { options })
  }

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const group = groups[groupIndex]
    updateGroup(groupIndex, {
      options: group.options.filter((_, i) => i !== optionIndex),
    })
  }

  const moveOption = (groupIndex: number, optionIndex: number, direction: -1 | 1) => {
    const target = optionIndex + direction
    const group = groups[groupIndex]
    if (target < 0 || target >= group.options.length) return
    const options = [...group.options]
    ;[options[optionIndex], options[target]] = [options[target], options[optionIndex]]
    updateGroup(groupIndex, { options })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group, gi) => (
        <div
          key={gi}
          className={cn(
            'rounded-xl bg-surface-container/50 border p-5',
            group.type === 'single'
              ? 'border-l-4 border-l-primary'
              : 'border-l-4 border-l-secondary',
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                placeholder="Group name (e.g. Milk Choice)"
                className="w-full bg-transparent border-none p-0 font-headline font-bold text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={group.type === 'multi'}
                    onChange={(e) =>
                      updateGroup(gi, { type: e.target.checked ? 'multi' : 'single' })
                    }
                    className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Multi-select
                  </span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={group.is_required}
                    onChange={(e) => updateGroup(gi, { is_required: e.target.checked })}
                    className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Required
                  </span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveGroup(gi, -1)}
                disabled={gi === 0}
                className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveGroup(gi, 1)}
                disabled={gi === groups.length - 1}
                className="text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeGroup(gi)}
                className="text-on-surface-variant hover:text-error transition-colors ml-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {group.options.map((option, oi) => (
              <div
                key={oi}
                className="flex items-center gap-2 rounded-lg bg-white/5 p-3 border border-white/10"
              >
                <GripVertical className="h-4 w-4 text-on-surface-variant shrink-0" />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveOption(gi, oi, -1)}
                    disabled={oi === 0}
                    className="text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(gi, oi, 1)}
                    disabled={oi === group.options.length - 1}
                    className="text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={option.name}
                  onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                  placeholder="Option name"
                  className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                />
                <div className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 border border-outline-variant">
                  <span className="text-[10px] text-primary font-bold">+$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={option.price_adjustment}
                    onChange={(e) =>
                      updateOption(gi, oi, {
                        price_adjustment: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-14 bg-transparent border-none p-0 text-xs font-bold text-on-surface focus:ring-0 text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(gi, oi)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(gi)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant py-2 text-xs font-bold text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="flex items-center gap-1 text-sm font-bold text-primary hover:opacity-80 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        New Group
      </button>

      {groups.length === 0 && (
        <p className="text-xs text-on-surface-variant italic">
          No modifier groups yet. Add customization options like size, milk choice, or toppings.
        </p>
      )}
    </div>
  )
}
