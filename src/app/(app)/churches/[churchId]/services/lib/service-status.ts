import type { VoicePart } from '@/types'
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
  voicePart: VoicePart | null
}

const REQUIRED_VOICE_PARTS: VoicePart[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS']

/**
 * Computes the "choir rota coverage" readiness of a service.
 *
 * - empty: no confirmed rota entries at all
 * - partial: confirmed entries exist but at least one voice part has zero
 * - ready: every voice part (S/A/T/B) has at least one confirmed singer
 *
 * Unconfirmed entries are ignored. Entries with a null voicePart do not
 * count toward any part (they cannot satisfy coverage on their own).
 */
export function computeRotaStatus(entries: RotaEntryRow[]): ServiceReadinessStatus {
  const confirmed = entries.filter((e) => e.confirmed)
  if (confirmed.length === 0) return 'empty'

  const covered = new Set(
    confirmed
      .map((e) => e.voicePart)
      .filter((vp): vp is VoicePart => vp !== null)
  )

  // If no confirmed entries have a voice part, treat as empty
  if (covered.size === 0) return 'empty'

  const missing = REQUIRED_VOICE_PARTS.filter((vp) => !covered.has(vp))
  if (missing.length === 0) return 'ready'
  return 'partial'
}
