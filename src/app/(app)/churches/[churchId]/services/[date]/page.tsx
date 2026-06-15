import { db } from '@/lib/db'
import {
  liturgicalDays,
  readings,
  services,
  musicSlots,
  hymns,
  anthems,
  massSettings,
  canticleSettings,
  responsesSettings,
  availability,
  rotaEntries,
  serviceSections,
  churches,
} from '@/lib/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireChurchRole, hasMinRole, coerceMemberRole } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { readLectionaryTrack } from '@/lib/churches/settings'
import { resolveLectionaryTrack, filterReadingsByTrack, hasTrackChoice } from '@/lib/lectionary/track'
import type { AdjacentDayLinks, PopulatedMusicSlot } from '@/types/service-views'
import { getAdjacentLiturgicalDays } from '@/lib/services/adjacent-liturgical-days'
import { MemberServiceView } from './member-service-view'
import { ServicePlanner } from './service-planner'
import { ServiceNav } from './service-nav'

interface Props {
  params: Promise<{ churchId: string; date: string }>
  searchParams: Promise<{ mode?: string }>
}

/** "2026-03-29" → "29 March 2026"; anything unparseable comes back as typed. */
function formatDisplayDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ServiceDetailPage({ params, searchParams }: Props) {
  const { churchId, date } = await params
  const { mode } = await searchParams

  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/churches')

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
  let adjacent: AdjacentDayLinks = { prev: null, next: null }
  // Editor data: per-service sections and raw music slots
  const editorSectionsMap: Record<string, InferSelectModel<typeof serviceSections>[]> = {}
  const editorSlotsMap: Record<string, InferSelectModel<typeof musicSlots>[]> = {}
  // Ordinary Time Continuous/Related track: does this day offer the choice, and
  // which track is active for the primary service?
  let trackChoiceAvailable = false
  let resolvedTrack: 'CONTINUOUS' | 'RELATED' = 'CONTINUOUS'

  try {
    const [days, adjacentResult] = await Promise.all([
      db
        .select()
        .from(liturgicalDays)
        .where(eq(liturgicalDays.date, date))
        .limit(1),
      getAdjacentLiturgicalDays(date),
    ])
    day = days[0] ?? null
    adjacent = adjacentResult

    if (day) {
      // Wave 1: readings and services are independent — fetch in parallel.
      const dayId = day.id
      ;[dayReadings, dayServices] = await Promise.all([
        db.select().from(readings).where(eq(readings.liturgicalDayId, dayId)),
        db
          .select()
          .from(services)
          .where(
            and(eq(services.churchId, churchId), eq(services.liturgicalDayId, dayId))
          )
          // Deterministic primary service on multi-service days — without an
          // ORDER BY, which service the member view binds to is up to Postgres.
          .orderBy(asc(services.time), asc(services.serviceType)),
      ])

      const service = dayServices[0] ?? null

      // Resolve the Continuous/Related psalm track (per-service override →
      // church default → CONTINUOUS) and show only that track's psalm. The OT
      // reading, epistle, gospel and Second/Third services are untouched.
      trackChoiceAvailable = hasTrackChoice(dayReadings)

      // Wave 2: every remaining read keys off `day`/`service`/`dayServices`
      // and none depend on each other, so issue them as a single parallel wave
      // instead of a serial chain.
      const churchRowPromise = trackChoiceAvailable
        ? db
            .select({ settings: churches.settings })
            .from(churches)
            .where(eq(churches.id, churchId))
            .limit(1)
        : null
      const availPromise = service
        ? db
            .select()
            .from(availability)
            .where(
              and(
                eq(availability.userId, userId),
                eq(availability.serviceId, service.id)
              )
            )
            .limit(1)
        : null
      const slotsPromise = service
        ? db
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
              massSettingName: massSettings.name,
              massSettingComposer: massSettings.composer,
              canticleSettingName: canticleSettings.name,
              canticleSettingComposer: canticleSettings.composer,
              canticleSettingCanticle: canticleSettings.canticle,
              responsesSettingName: responsesSettings.name,
              responsesSettingComposer: responsesSettings.composer,
            })
            .from(musicSlots)
            .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
            .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
            .leftJoin(massSettings, eq(musicSlots.massSettingId, massSettings.id))
            .leftJoin(canticleSettings, eq(musicSlots.canticleSettingId, canticleSettings.id))
            .leftJoin(responsesSettings, eq(musicSlots.responsesSettingId, responsesSettings.id))
            .where(eq(musicSlots.serviceId, service.id))
            .orderBy(asc(musicSlots.positionOrder))
        : null
      const rotaPromise =
        service && isEditor
          ? db
              .select()
              .from(rotaEntries)
              .where(
                and(
                  eq(rotaEntries.serviceId, service.id),
                  eq(rotaEntries.confirmed, true)
                )
              )
          : null
      // Editor mode needs every service's sections and raw slots.
      const svcIds = dayServices.map((s) => s.id)
      const editorPromise =
        isEditMode && svcIds.length > 0
          ? Promise.all([
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
            ])
          : null

      const [churchRow, avail, slots, rota, editorData] = await Promise.all([
        churchRowPromise,
        availPromise,
        slotsPromise,
        rotaPromise,
        editorPromise,
      ])

      if (trackChoiceAvailable && churchRow) {
        resolvedTrack = resolveLectionaryTrack(
          service?.lectionaryTrack,
          readLectionaryTrack(churchRow[0]?.settings),
        )
        dayReadings = filterReadingsByTrack(dayReadings, resolvedTrack)
      }
      if (avail) {
        userAvail =
          (avail[0]?.status as
            | 'AVAILABLE'
            | 'UNAVAILABLE'
            | 'TENTATIVE'
            | undefined) ?? null
      }
      if (slots) {
        populatedSlots = slots as PopulatedMusicSlot[]
      }
      if (rota) {
        confirmedCount = rota.length
      }
      if (editorData) {
        const [allSections, allSlots] = editorData
        for (const svc of dayServices) {
          editorSectionsMap[svc.id] = allSections.filter((s) => s.serviceId === svc.id)
          editorSlotsMap[svc.id] = allSlots.filter((s) => s.serviceId === svc.id)
        }
      }
    }
  } catch (err) {
    logger.error("[services/[date]/page] Failed to load service data", err);
  }

  if (!day) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <ServiceNav churchId={churchId} adjacent={adjacent} />
        <p className="text-muted-foreground">
          There&apos;s nothing in the church calendar for {formatDisplayDate(date)}.
        </p>
      </div>
    )
  }

  const service = (dayServices[0] as {
    id: string; serviceType: string; time: string | null;
  } | undefined) ?? null

  // Edit mode: existing planner (editors/admins only).
  // ServicePlanner renders its own ServiceNav internally (with "Back to service view"),
  // so no BackLink at this level — the nav lives next to the planner's prev/next.
  if (isEditMode) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <ServicePlanner
          churchId={churchId}
          liturgicalDayId={day.id}
          date={date}
          existingServices={dayServices as Parameters<typeof ServicePlanner>[0]['existingServices']}
          editorSectionsMap={editorSectionsMap}
          editorSlotsMap={editorSlotsMap}
          readings={dayReadings}
          adjacent={adjacent}
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
      trackChoice={
        trackChoiceAvailable && service
          ? { active: resolvedTrack, usingDefault: !dayServices[0]?.lectionaryTrack }
          : null
      }
      musicSlots={populatedSlots}
      userAvailability={userAvail}
      role={role}
      confirmedCount={isEditor ? confirmedCount : undefined}
      editUrl={`/churches/${churchId}/services/${date}?mode=edit`}
      adjacent={adjacent}
    />
  )
}
