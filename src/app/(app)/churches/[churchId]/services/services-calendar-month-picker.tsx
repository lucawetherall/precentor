'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  year: number
  month: number
  onSelect: (year: number, month: number) => void
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function ServicesCalendarMonthPicker({ year, month, onSelect }: Props) {
  const [displayYear, setDisplayYear] = useState(year)

  return (
    <div className="w-56">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous year"
          onClick={() => setDisplayYear((y) => y - 1)}
          className="p-1 hover:bg-muted transition-colors rounded-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="small-caps text-sm font-semibold">{displayYear}</span>
        <button
          type="button"
          aria-label="Next year"
          onClick={() => setDisplayYear((y) => y + 1)}
          className="p-1 hover:bg-muted transition-colors rounded-sm"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_LABELS.map((label, idx) => {
          const isCurrent = displayYear === year && idx === month
          return (
            <button
              key={label}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onSelect(displayYear, idx)}
              className={cn(
                'small-caps text-xs py-2 rounded-sm border transition-colors',
                isCurrent
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent hover:bg-muted'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
