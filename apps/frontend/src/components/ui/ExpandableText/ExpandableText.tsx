'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpandableTextProps {
  text: string
  className?: string
}

export function ExpandableText({ text, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) {
      setOverflows(el.scrollHeight > el.clientHeight)
    }
  }, [text])

  return (
    <div>
      <p
        ref={ref}
        className={cn(className, !expanded && 'line-clamp-1')}
      >
        {text}
      </p>
      {overflows && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-label font-bold text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show more <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  )
}
