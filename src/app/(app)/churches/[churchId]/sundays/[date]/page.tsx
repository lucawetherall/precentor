import { db } from '@/lib/db'
import {
  liturgicalDays,
  readings,
  services,
  musicSlots,
  hymns,
  anthems,
  availability,
  rotaEntries,
} from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireChurchRole, hasMinRole } from '@/lib/auth/permissions'
import type { MemberRole } from '@/types'
import type { PopulatedMusicSlot } from '@/types/service-views'
import { MemberServiceView } from './member-service-view'
import { ServicePlanner } from './service-planner'

interface Props {
  params: Promise<{ churchId: string; date: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function SundayDetailPage({ params, searchParams }: Props) {
  const { churchId, date } = await params
  const { mode } = await searchParams

  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = membership!.role as MemberRole
  const isEditor = hasMinRole(role, 'EDITOR')
  const isEditMode = isEditor && mode === 'edit'

  // --- Data fetching ---
  let day: InferSelectModel<typeof liturgicalDays> | null = null
  let dayReadings: InferSelectModel<typeof readings>[] = []
  let dayServices: InferSelectModel<typeof services>[] = []
  let populatedSlots: PopulatedMusicSlot[] = []
  let userAvail: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null = null
  let confirmedCount = 0

  try {
    const days = await db
      .select()
      .from(liturgicalDays)
      .where(eq(liturgicalDays.date, date))
      .limit(1)
    day = days[0] ?? null

    if (day) {
      dayReadings = await db
        .select()
        .from(readings)
        .where(eq(readings.liturgicalDayId, day.id))

      dayServices = await db
        .select()
        .from(services)
        .where(
          and(eq(services.churchId, churchId), eq(services.liturgicalDayId, day.id))
        )

      const service = dayServices[0] ?? null

      if (service) {
        const avail = await db
          .select()
          .from(availability)
          .where(
            and(
              eq(availability.userId, userId),
              eq(availability.serviceId, service.id)
            )
          )
          .limit(1)
        userAvail = (avail[0]?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | undefined) ?? null

        populatedSlots = (await db
          .select({
            id: musicSlots.id,
            slotType: musicSlots.slotType,
            positionOrder: musicSlots.positionOrder,
            freeText: musicSlots.freeText,
            notes: musicSlots.notes,
            hymnBook: hymns.book,
            hymnNumber: hymns.number,
            hymnFirstLine: hymns.firstLine,
            hymnTuneName: hymns.tuneName,
            anthemTitle: anthems.title,
            anthemComposer: anthems.composer,
            anthemVoicing: anthems.voicing,
          })
          .from(musicSlots)
          .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
          .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
          .where(eq(musicSlots.serviceId, service.id))
          .orderBy(asc(musicSlots.positionOrder))) as PopulatedMusicSlot[]

        if (isEditor) {
          const rota = await db
            .select()
            .from(rotaEntries)
            .where(
              and(
                eq(rotaEntries.serviceId, service.id),
                eq(rotaEntries.confirmed, true)
              )
            )
          confirmedCount = rota.length
        }
      }
    }
  } catch {
    /* DB not available */
  }

  if (!day) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No liturgical data for {date}.</p>
        <Link
          href={`/churches/${churchId}/sundays`}
          className="flex items-center gap-1 text-sm text-primary underline mt-2"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Sundays
        </Link>
      </div>
    )
  }

  const service = (dayServices[0] as {
    id: string; serviceType: string; time: string | null
  } | undefined) ?? null

  // Edit mode: existing planner (editors/admins only)
  if (isEditMode) {
    return (
      <div className="p-8 max-w-5xl">
        <Link
          href={`/churches/${churchId}/sundays/${date}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to service view
        </Link>
        <ServicePlanner
          churchId={churchId}
          liturgicalDayId={day.id}
          date={date}
          existingServices={dayServices as Parameters<typeof ServicePlanner>[0]['existingServices']}
        />
      </div>
    )
  }

  // Default view for all roles
  return (
    <MemberServiceView
      churchId={churchId}
      day={{
        cwName: day.cwName,
        date: day.date,
        colour: day.colour,
        season: day.season,
        collect: day.collect ?? null,
      }}
      service={service}
      readings={dayReadings as Parameters<typeof MemberServiceView>[0]['readings']}
      musicSlots={populatedSlots}
      userAvailability={userAvail}
      role={role}
      confirmedCount={isEditor ? confirmedCount : undefined}
      editUrl={`/churches/${churchId}/sundays/${date}?mode=edit`}
    />
  )
}
