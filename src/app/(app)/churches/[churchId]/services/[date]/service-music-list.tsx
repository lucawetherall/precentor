import { MUSIC_SLOT_LABELS } from '@/types'
import type { MusicSlotType } from '@/types'
import type { PopulatedMusicSlot } from '@/types/service-views'

interface ServiceMusicListProps {
  slots: PopulatedMusicSlot[]
}

function humaniseCanticle(canticle: string | null): string {
  if (!canticle) return 'Canticle setting'
  return canticle
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function resolveSlot(slot: PopulatedMusicSlot): { title: string; detail: string | null; assigned: boolean } {
  if (slot.hymnFirstLine && slot.hymnBook && slot.hymnNumber != null) {
    return {
      title: `${slot.hymnBook} ${slot.hymnNumber} — ${slot.hymnFirstLine}`,
      detail: slot.hymnTuneName ?? null,
      assigned: true,
    }
  }
  if (slot.anthemTitle) {
    const parts = [slot.anthemComposer, slot.anthemVoicing].filter(Boolean)
    return { title: slot.anthemTitle, detail: parts.length ? parts.join(' · ') : null, assigned: true }
  }
  if (slot.massSettingName) {
    return { title: slot.massSettingName, detail: slot.massSettingComposer ?? null, assigned: true }
  }
  if (slot.canticleSettingName || slot.canticleSettingComposer) {
    return {
      title: slot.canticleSettingName ?? humaniseCanticle(slot.canticleSettingCanticle),
      detail: slot.canticleSettingComposer ?? null,
      assigned: true,
    }
  }
  if (slot.responsesSettingName) {
    return { title: slot.responsesSettingName, detail: slot.responsesSettingComposer ?? null, assigned: true }
  }
  if (slot.freeText) {
    return { title: slot.freeText, detail: null, assigned: true }
  }
  return { title: 'Not yet assigned', detail: null, assigned: false }
}

export function ServiceMusicList({ slots }: ServiceMusicListProps) {
  if (slots.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground italic">
          No music planned for this service.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {slots.map((slot) => {
        const { title, detail, assigned } = resolveSlot(slot)
        return (
          <div key={slot.id} className="flex gap-4 py-4 items-start">
            <span className="small-caps text-xs text-muted-foreground w-32 flex-shrink-0 pt-1">
              {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] ?? slot.slotType}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={
                  assigned
                    ? 'font-heading text-base'
                    : 'text-sm text-muted-foreground italic'
                }
              >
                {title}
              </p>
              {detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
