'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ServicesList } from './services-list'
import { ServicesAgenda } from './services-agenda'
import { ServicesCalendar } from './services-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'
type ViewMode = 'list' | 'agenda' | 'calendar'

interface ServicesViewWrapperProps {
  churchId: string
  liturgicalDays: LiturgicalDayWithService[]
}

const LS_KEY = 'precentor:services-view'
const VALID_VIEWS: ViewMode[] = ['list', 'agenda', 'calendar']

export function ServicesViewWrapper({
  churchId,
  liturgicalDays,
}: ServicesViewWrapperProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlView = searchParams.get('view') as ViewMode | null
  const isValidUrl = urlView && VALID_VIEWS.includes(urlView)

  // Derive active view: URL → localStorage → default
  let view: ViewMode = 'list'
  if (isValidUrl) {
    view = urlView
  } else if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null
    if (stored && VALID_VIEWS.includes(stored)) view = stored
  }

  useEffect(() => {
    if (isValidUrl) localStorage.setItem(LS_KEY, urlView)
  }, [urlView, isValidUrl])

  function setView(v: ViewMode) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', v)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-semibold">Upcoming Services</h1>
        <div className="flex border border-border overflow-hidden">
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
      </div>

      {view === 'list' && <ServicesList churchId={churchId} days={liturgicalDays} />}
      {view === 'agenda' && <ServicesAgenda churchId={churchId} days={liturgicalDays} />}
      {view === 'calendar' && <ServicesCalendar churchId={churchId} days={liturgicalDays} />}
    </>
  )
}
