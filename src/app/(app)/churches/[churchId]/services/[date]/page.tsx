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
  serviceSections,
} from '@/lib/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireChurchRole, hasMinRole, coerceMemberRole } from '@/lib/auth/permissions'
import { BackLink } from '@/components/back-link'
import type { PopulatedMusicSlot } from '@/types/service-views'
import { MemberServiceView } from './member-service-view'
import { ServicePlanner } from './service-planner'

interface Props {
  params: Promise<{ churchId: string; date: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function ServiceDetailPage({ params, searchParams }: Props) {
  const { churchId, date } = await params
  const { mode } = await searchParams

  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = coerceMemberRole(membership!.role)
  const isEditor = hasMinRole(role, 'EDITOR')
  const isEditMode = isEditor && mode === 'edit'

  // --- Data fetching ---
  let day: InferSelectModel<typeof liturgicalDays> | null = null
  let dayReadings: InferSelectModel<typeof readings>[] = []
  let dayServices: InferSelectModel<typeof services>[] = []
  let populatedSlots: PopulatedMusicSlot[] = []
  let userAvail: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null = null
  let confirmedCount = 0
  // Editor data: per-service sections and raw music slots
  const editorSectionsMap: Record<string, InferSelectModel<typeof serviceSections>[]> = {}
  const editorSlotsMap: Record<string, InferSelectModel<typeof musicSlots>[]> = {}

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

      // Fetch sections and raw slots for all services (for editor mode)
      if (isEditMode && dayServices.length > 0) {
        const svcIds = dayServices.map((s) => s.id);
        const [allSections, allSlots] = await Promise.all([
          db
            .select()
            .from(serviceSections)
            .where(inArray(serviceSections.serviceId, svcIds))
            .orderBy(asc(serviceSections.positionOrder)),
          db
            .select()
            .from(musicSlots)
            .where(inArray(musicSlots.serviceId, svcIds))
            .orderBy(asc(musicSlots.positionOrder)),
        ]);
        // Group by serviceId
        for (const svc of dayServices) {
          editorSectionsMap[svc.id] = allSections.filter((s) => s.serviceId === svc.id);
          editorSlotsMap[svc.id] = allSlots.filter((s) => s.serviceId === svc.id);
        }
      }
    }
  } catch (err) {
    console.error("Failed to load service data:", err);
  }

  if (!day) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <p className="text-muted-foreground">No liturgical data for {date}.</p>
        <div className="mt-2">
          <BackLink href={`/churches/${churchId}/services`}>Back to Services</BackLink>
        </div>
      </div>
    )
  }

  const service = (dayServices[0] as {
    id: string; serviceType: string; time: string | null; choirStatus: string
  } | undefined) ?? null

  // Edit mode: existing planner (editors/admins only)
  if (isEditMode) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="mb-4">
          <BackLink href={`/churches/${churchId}/services/${date}`}>Back to service view</BackLink>
        </div>
        <ServicePlanner
          churchId={churchId}
          liturgicalDayId={day.id}
          date={date}
          existingServices={dayServices as Parameters<typeof ServicePlanner>[0]['existingServices']}
          editorSectionsMap={editorSectionsMap}
          editorSlotsMap={editorSlotsMap}
          readings={dayReadings}
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
      editUrl={`/churches/${churchId}/services/${date}?mode=edit`}
    />
  )
}
