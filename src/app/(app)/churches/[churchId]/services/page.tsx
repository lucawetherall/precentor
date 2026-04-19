import { db } from '@/lib/db'
import {
  liturgicalDays,
  services,
  availability,
  musicSlots,
  hymns,
  anthems,
  rotaEntries,
} from '@/lib/db/schema'
import { gte, asc, eq, and, inArray } from 'drizzle-orm'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requireChurchRole } from '@/lib/auth/permissions'
import type { LiturgicalDayWithService, MusicSlotPreview } from '@/types/service-views'
import { MUSIC_SLOT_LABELS } from '@/types'
import type { MusicSlotType } from '@/types'
import { ServicesViewWrapper } from './services-view-wrapper'
import { computeMusicStatus, computeRotaStatus } from './lib/service-status'

interface Props {
  params: Promise<{ churchId: string }>
}

export default async function ServicesPage({ params }: Props) {
  const { churchId } = await params
  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = (membership!.role as import('@/types').MemberRole)
  const today = format(new Date(), 'yyyy-MM-dd')

  let days: LiturgicalDayWithService[] = []

  try {
    const upcomingDays = await db
      .select()
      .from(liturgicalDays)
      .where(gte(liturgicalDays.date, today))
      .orderBy(asc(liturgicalDays.date))
      .limit(20)

    const dayIds = upcomingDays.map((d) => d.id)

    const churchServices =
      dayIds.length > 0
        ? await db
            .select()
            .from(services)
            .where(
              and(
                eq(services.churchId, churchId),
                inArray(services.liturgicalDayId, dayIds)
              )
            )
        : []

    const serviceIds = churchServices.map((s) => s.id)

    const userAvailability =
      serviceIds.length > 0
        ? await db
            .select()
            .from(availability)
            .where(
              and(
                eq(availability.userId, userId),
                inArray(availability.serviceId, serviceIds)
              )
            )
        : []

    const slots =
      serviceIds.length > 0
        ? await db
            .select({
              id: musicSlots.id,
              serviceId: musicSlots.serviceId,
              slotType: musicSlots.slotType,
              positionOrder: musicSlots.positionOrder,
              freeText: musicSlots.freeText,
              hymnId: musicSlots.hymnId,
              anthemId: musicSlots.anthemId,
              hymnFirstLine: hymns.firstLine,
              anthemTitle: anthems.title,
            })
            .from(musicSlots)
            .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
            .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
            .where(inArray(musicSlots.serviceId, serviceIds))
            .orderBy(asc(musicSlots.positionOrder))
        : []

    const rotas =
      serviceIds.length > 0
        ? await db
            .select({
              serviceId: rotaEntries.serviceId,
              confirmed: rotaEntries.confirmed,
            })
            .from(rotaEntries)
            .where(inArray(rotaEntries.serviceId, serviceIds))
        : []

    // Build lookup maps for O(1) access
    const servicesByDayId = new Map<string, typeof churchServices>();
    for (const s of churchServices) {
      const existing = servicesByDayId.get(s.liturgicalDayId) ?? [];
      existing.push(s);
      servicesByDayId.set(s.liturgicalDayId, existing);
    }
    const availByServiceId = new Map(
      userAvailability.map((a) => [a.serviceId, a])
    );
    const slotsByServiceId = new Map<string, typeof slots>();
    for (const slot of slots) {
      const existing = slotsByServiceId.get(slot.serviceId) ?? [];
      existing.push(slot);
      slotsByServiceId.set(slot.serviceId, existing);
    }

    const rotasByServiceId = new Map<string, typeof rotas>();
    for (const entry of rotas) {
      const existing = rotasByServiceId.get(entry.serviceId) ?? [];
      existing.push(entry);
      rotasByServiceId.set(entry.serviceId, existing);
    }

    days = upcomingDays.map((day) => {
      const dayServices = servicesByDayId.get(day.id) ?? []
      if (dayServices.length === 0) return { ...day, services: [] }

      return {
        ...day,
        services: dayServices.map((service) => {
          const avail = availByServiceId.get(service.id)
          const serviceSlots = slotsByServiceId.get(service.id) ?? []
          const serviceRotas = rotasByServiceId.get(service.id) ?? []

          const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
            id: slot.id,
            slotType: slot.slotType as MusicSlotPreview['slotType'],
            positionOrder: slot.positionOrder,
            title:
              slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ??
              (MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] ?? slot.slotType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())),
          }))

          const musicStatus = computeMusicStatus(
            serviceSlots.map((s) => ({
              hymnId: s.hymnId,
              anthemId: s.anthemId,
              freeText: s.freeText,
            }))
          )

          const rotaStatus = computeRotaStatus(serviceRotas)

          return {
            id: service.id,
            serviceType: service.serviceType,
            time: service.time,
            status: service.status,
            userAvailability:
              (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
              null,
            musicPreview,
            musicStatus,
            rotaStatus,
          }
        }),
      }
    })
  } catch (err) {
    console.error("Failed to load data:", err)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Suspense>
        <ServicesViewWrapper
          churchId={churchId}
          liturgicalDays={days}
          role={role}
        />
      </Suspense>
    </div>
  )
}
