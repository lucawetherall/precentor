import { MUSIC_SLOT_LABELS } from '@/types'
import type { MusicSlotType } from '@/types'
import type { PopulatedMusicSlot } from '@/types/service-views'

interface ServiceMusicListProps {
  slots: PopulatedMusicSlot[]
}

function resolveSlot(slot: PopulatedMusicSlot): { title: string; detail: string | null } {
  if (slot.hymnFirstLine && slot.hymnBook && slot.hymnNumber != null) {
    return {
      title: `${slot.hymnBook} ${slot.hymnNumber} — ${slot.hymnFirstLine}`,
      detail: slot.hymnTuneName ?? null,
    }
  }
  if (slot.anthemTitle) {
    const parts = [slot.anthemComposer, slot.anthemVoicing].filter(Boolean)
    return { title: slot.anthemTitle, detail: parts.length ? parts.join(' · ') : null }
  }
  if (slot.freeText) {
    return { title: slot.freeText, detail: null }
  }
  return { title: 'Not yet assigned', detail: null }
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
        const { title, detail } = resolveSlot(slot)
        const isEmpty = !slot.hymnFirstLine && !slot.anthemTitle && !slot.freeText
        return (
          <div key={slot.id} className="flex gap-4 py-3 items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground w-28 flex-shrink-0 pt-1">
              {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] ?? slot.slotType}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={
                  isEmpty
                    ? 'text-sm text-muted-foreground italic'
                    : 'font-heading text-base'
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
