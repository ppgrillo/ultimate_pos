'use client'



interface DiningOptionToggleProps {
  value: 'dine-in' | 'takeaway' | 'delivery'
  onChange: (value: 'dine-in' | 'takeaway' | 'delivery') => void
}

const options = [
  { id: 'dine-in' as const, label: 'Dine-in', icon: '🍽️' },
  { id: 'takeaway' as const, label: 'Takeaway', icon: '🥡' },
]

export function DiningOptionToggle({ value, onChange }: DiningOptionToggleProps) {
  return (
    <div className="flex rounded-lg bg-surface-container-high p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-label font-bold transition-colors ${
            value === opt.id
              ? 'bg-primary text-primary-on'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
