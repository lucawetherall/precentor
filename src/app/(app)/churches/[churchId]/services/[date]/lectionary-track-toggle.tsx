'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Track = 'CONTINUOUS' | 'RELATED'

interface Props {
  churchId: string
  serviceId: string
  /** Currently active (resolved) track for this service. */
  active: Track
  /** True when the active track comes from the church default, not an explicit override. */
  usingDefault: boolean
}

/**
 * Editor-only control to choose the Ordinary Time psalm track (Continuous or
 * Related) for a single service. Only the psalm changes — the OT reading,
 * epistle and gospel are unaffected. Persists via PATCH and refreshes.
 */
export function LectionaryTrackToggle({ churchId, serviceId, active, usingDefault }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState<Track | null>(null)
  const [error, setError] = useState(false)

  async function choose(track: Track) {
    if (saving) return
    setError(false)
    setSaving(track)
    try {
      const res = await fetch(`/api/churches/${churchId}/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectionaryTrack: track }),
      })
      if (!res.ok) throw new Error('save failed')
      startTransition(() => router.refresh())
    } catch {
      setError(true)
    } finally {
      setSaving(null)
    }
  }

  const tracks: { value: Track; label: string }[] = [
    { value: 'CONTINUOUS', label: 'Continuous' },
    { value: 'RELATED', label: 'Related' },
  ]

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border border-border bg-muted/20 mb-2">
      <span className="small-caps text-xs text-muted-foreground">Psalm</span>
      <div className="inline-flex border border-border" role="group" aria-label="Psalm track">
        {tracks.map((t) => {
          const isActive = t.value === active
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => choose(t.value)}
              disabled={saving !== null}
              aria-pressed={isActive}
              className={[
                'px-3 py-1 text-xs font-heading transition-colors disabled:opacity-60',
                isActive
                  ? 'bg-foreground text-background'
                  : 'bg-transparent text-muted-foreground hover:bg-accent',
                t.value === 'RELATED' ? 'border-l border-border' : '',
              ].join(' ')}
            >
              {saving === t.value ? '…' : t.label}
            </button>
          )
        })}
      </div>
      {usingDefault && !error && (
        <span className="text-xs text-muted-foreground">church default</span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert">Couldn&apos;t save — try again</span>
      )}
    </div>
  )
}
