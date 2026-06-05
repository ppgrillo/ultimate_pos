import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-label font-bold text-on-surface-variant"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/50 backdrop-blur-glass transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-error focus-visible:ring-error'
              : 'border-outline-variant focus-visible:border-primary',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
export type { InputProps }
