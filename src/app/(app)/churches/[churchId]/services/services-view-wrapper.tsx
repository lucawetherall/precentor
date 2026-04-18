'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ServicesList } from './services-list'
import { ServicesCalendar } from './services-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'
import type { MemberRole } from '@/types'

type ViewMode = 'list' | 'calendar'

interface ServicesViewWrapperProps {
  churchId: string
  liturgicalDays: LiturgicalDayWithService[]
  role: MemberRole
}

const LS_KEY = 'precentor:services-view'
const VALID_VIEWS: ViewMode[] = ['list', 'calendar']
const DESKTOP_MIN_WIDTH = 768

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches
  })
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export function ServicesViewWrapper({
  churchId,
  liturgicalDays,
  role,
}: ServicesViewWrapperProps) {
  const isDesktop = useIsDesktop()
  // Lazy initializer reads localStorage once on mount. SSR returns 'list'
  // deterministically, which matches the first client render before hydration.
  const [view, setViewState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'list'
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null
    return stored && VALID_VIEWS.includes(stored) ? stored : 'list'
  })

  function setView(v: ViewMode) {
    setViewState(v)
    localStorage.setItem(LS_KEY, v)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-semibold">Upcoming Services</h1>
        {isDesktop && (
          <div className="flex border border-border overflow-hidden rounded-sm">
            {VALID_VIEWS.map((v, i) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-2 text-sm capitalize transition-colors',
                  i > 0 && 'border-l border-border',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'list' && <ServicesList churchId={churchId} days={liturgicalDays} />}
      {view === 'calendar' && (
        <ServicesCalendar churchId={churchId} days={liturgicalDays} role={role} />
      )}
    </>
  )
}
