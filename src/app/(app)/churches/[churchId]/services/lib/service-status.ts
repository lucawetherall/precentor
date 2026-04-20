import type { ServiceReadinessStatus } from '@/types/service-views'

interface MusicSlotRow {
  hymnId: string | null
  anthemId: string | null
  freeText: string | null
}

/**
 * Computes the "music planned" readiness of a service.
 *
 * - empty: no slots, or no slots have content
 * - partial: some slots have content, some don't
 * - ready: every slot has content
 */
export function computeMusicStatus(slots: MusicSlotRow[]): ServiceReadinessStatus {
  if (slots.length === 0) return 'empty'

  const filled = slots.filter(
    (s) => s.hymnId !== null || s.anthemId !== null || (s.freeText !== null && s.freeText !== '')
  )

  if (filled.length === 0) return 'empty'
  if (filled.length < slots.length) return 'partial'
  return 'ready'
}

interface RotaEntryRow {
  confirmed: boolean
}

/**
 * Computes the "choir rota coverage" readiness of a service.
 *
 * - empty: no confirmed rota entries at all
 * - partial: some confirmed entries exist (but coverage cannot be fully determined without role data)
 * - ready: at least one confirmed entry exists per role slot (simplified post-Phase-D)
 */
export function computeRotaStatus(entries: RotaEntryRow[]): ServiceReadinessStatus {
  const confirmed = entries.filter((e) => e.confirmed)
  if (confirmed.length === 0) return 'empty'
  return 'partial'
}
