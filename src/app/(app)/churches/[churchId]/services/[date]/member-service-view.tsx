import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour, MemberRole } from '@/types'
import { hasMinRole } from '@/lib/auth/permissions'
import type { PopulatedMusicSlot } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { ServiceMusicList } from './service-music-list'
import { ReadingsByLectionary } from './readings-by-lectionary'
import { CHOIR_STATUS_LABELS, CHOIR_STATUS_PILL_CLASSES } from '../choir-status-constants'

interface Reading {
  id: string
  position: string
  lectionary: string
  reference: string
  readingText: string | null
}

interface ServiceInfo {
  id: string
  serviceType: string
  time: string | null
  choirStatus: string
}

interface MemberServiceViewProps {
  churchId: string
  day: {
    cwName: string
    date: string
    colour: string
    season: string
    collect: string | null
  }
  service: ServiceInfo | null
  readings: Reading[]
  musicSlots: PopulatedMusicSlot[]
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  role: MemberRole
  confirmedCount?: number
  editUrl: string
}

export function MemberServiceView({
  churchId,
  day,
  service,
  readings,
  musicSlots,
  userAvailability,
  role,
  confirmedCount,
  editUrl,
}: MemberServiceViewProps) {
  const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
  const isEditor = hasMinRole(role, 'EDITOR')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      {/* Back link */}
      <Link
        href={`/churches/${churchId}/services`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Services
      </Link>

      {/* Editor notice (EDITOR/ADMIN only) */}
      {isEditor && (
        <div className="flex items-center justify-between p-3 mb-4 border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Editor view</span>
            {confirmedCount !== undefined &&
              ` — ${confirmedCount} singer${confirmedCount !== 1 ? 's' : ''} confirmed`}
          </p>
          <Link
            href={editUrl}
            className="text-sm border border-border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            ✎ Edit music & details
          </Link>
        </div>
      )}

      {/* Choir status badge (all roles, only if service exists and non-default) */}
      {service && service.choirStatus !== 'CHOIR_REQUIRED' && (
        <div className="mb-4">
          <span
            className={`small-caps text-xs px-2 py-1 ${CHOIR_STATUS_PILL_CLASSES[service.choirStatus] ?? 'bg-muted text-muted-foreground border border-border'}`}
          >
            {CHOIR_STATUS_LABELS[service.choirStatus] ?? service.choirStatus}
          </span>
        </div>
      )}

      {/* Service header */}
      <div className="flex items-start gap-4 mb-6">
        <span
          role="img"
          aria-label={`${day.season.replace(/_/g, ' ').toLowerCase()} — liturgical colour ${day.colour.toLowerCase()}`}
          className="w-4 h-14 flex-shrink-0 mt-1 rounded-sm"
          style={{ backgroundColor: colour }}
        />
        <div className="flex-1 min-w-0">
          <p className="small-caps text-xs text-muted-foreground mb-1">
            {day.season.replace(/_/g, ' ')}
          </p>
          <h1 className="text-3xl font-heading font-semibold leading-tight text-balance">{day.cwName}</h1>
          <p className="small-caps text-xs text-muted-foreground mt-1">
            {format(parseISO(day.date), 'EEEE d MMMM yyyy')}
            {service &&
              ` · ${SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? service.serviceType}`}
            {service?.time && ` · ${service.time}`}
          </p>
        </div>
      </div>

      {/* Availability (all roles, only if service exists) */}
      {service && (
        <div className="flex items-center gap-6 p-4 mb-6 border border-border bg-card shadow-sm">
          <div className="flex-1">
            <p className="font-medium">Are you available for this service?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You can change this at any time.
            </p>
          </div>
          <AvailabilityWidget
            serviceId={service.id}
            churchId={churchId}
            currentStatus={userAvailability}
            size="lg"
          />
        </div>
      )}

      {/* Readings + Collect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {readings.length > 0 && (
          <div className="border border-border bg-card">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h2 className="small-caps text-xs text-muted-foreground">
                Readings
              </h2>
            </div>
            <ReadingsByLectionary readings={readings} />
          </div>
        )}

        {day.collect && (
          <div className="border border-border bg-card">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h2 className="small-caps text-xs text-muted-foreground">
                Collect
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm italic text-muted-foreground leading-relaxed">
                {day.collect}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Music list */}
      <div className="border border-border bg-card">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="small-caps text-xs text-muted-foreground">
            Music
          </h2>
          {service && (
            <span className="text-xs text-muted-foreground">
              {SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ??
                service.serviceType}
            </span>
          )}
        </div>
        <div className="px-4">
          <ServiceMusicList slots={musicSlots} />
        </div>
      </div>
    </div>
  )
}
