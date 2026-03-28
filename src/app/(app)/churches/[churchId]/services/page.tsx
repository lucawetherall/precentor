import { db } from '@/lib/db'
import {
  liturgicalDays,
  services,
  availability,
  musicSlots,
  hymns,
  anthems,
} from '@/lib/db/schema'
import { gte, asc, eq, and, inArray } from 'drizzle-orm'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requireChurchRole } from '@/lib/auth/permissions'
import type { MemberRole } from '@/types'
import type { LiturgicalDayWithService, MusicSlotPreview } from '@/types/service-views'
import { ServicesViewWrapper } from './services-view-wrapper'

interface Props {
  params: Promise<{ churchId: string }>
}

export default async function ServicesPage({ params }: Props) {
  const { churchId } = await params
  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = membership!.role as MemberRole
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
              hymnFirstLine: hymns.firstLine,
              anthemTitle: anthems.title,
            })
            .from(musicSlots)
            .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
            .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
            .where(inArray(musicSlots.serviceId, serviceIds))
            .orderBy(asc(musicSlots.positionOrder))
        : []

    days = upcomingDays.map((day) => {
      const service = churchServices.find((s) => s.liturgicalDayId === day.id) ?? null
      if (!service) return { ...day, service: null }

      const avail = userAvailability.find((a) => a.serviceId === service.id)
      const serviceSlots = slots.filter((s) => s.serviceId === service.id)

      const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
        id: slot.id,
        slotType: slot.slotType as MusicSlotPreview['slotType'],
        positionOrder: slot.positionOrder,
        title:
          slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ?? slot.slotType,
      }))

      return {
        ...day,
        service: {
          id: service.id,
          serviceType: service.serviceType,
          time: service.time,
          status: service.status,
          choirStatus: service.choirStatus,
          userAvailability:
            (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
            null,
          musicPreview,
        },
      }
    })
  } catch (err) {
    console.error("Failed to load data:", err)
  }

  return (
    <div className="p-8 max-w-4xl">
      <Suspense>
        <ServicesViewWrapper
          churchId={churchId}
          liturgicalDays={days}
        />
      </Suspense>
    </div>
  )
}
