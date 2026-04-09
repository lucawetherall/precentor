'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ServicesCalendarMonthPicker } from './services-calendar-month-picker'

interface Props {
  year: number
  month: number
  serviceCount: number
  isCurrentMonth: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectMonth: (year: number, month: number) => void
}

export function ServicesCalendarHeader({
  year,
  month,
  serviceCount,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
  onSelectMonth,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const title = format(new Date(year, month, 1), 'MMMM yyyy')
  const countLabel = `${serviceCount} ${serviceCount === 1 ? 'service' : 'services'}`

  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger className="inline-flex items-center gap-1 rounded-sm px-2 py-1 font-heading text-xl font-semibold hover:bg-muted transition-colors">
            {title}
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </PopoverTrigger>
          <PopoverContent align="start">
            <ServicesCalendarMonthPicker
              year={year}
              month={month}
              onSelect={(y, m) => {
                onSelectMonth(y, m)
                setPickerOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>

        <span className="small-caps text-xs text-muted-foreground ml-2">
          {countLabel}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isCurrentMonth}
        onClick={onToday}
      >
        Today
      </Button>
    </div>
  )
}
