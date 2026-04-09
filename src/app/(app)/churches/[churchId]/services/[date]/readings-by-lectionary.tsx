'use client'

import { POSITION_LABELS } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface Reading {
  id: string
  position: string
  lectionary: string
  reference: string
  readingText: string | null
}

interface ReadingsByLectionaryProps {
  readings: Reading[]
}

const LECTIONARY_LABELS: Record<string, string> = {
  PRINCIPAL: 'Principal Service',
  SECOND: 'Second Service',
  THIRD: 'Third Service',
}

const LECTIONARY_ORDER = ['PRINCIPAL', 'SECOND', 'THIRD'] as const

function ReadingRows({ readings }: { readings: Reading[] }) {
  return (
    <div className="divide-y divide-border">
      {readings.map((r) => (
        <div key={r.id} className="flex gap-3 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground w-24 flex-shrink-0 font-mono text-xs">
            {POSITION_LABELS[r.position] ?? r.position.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <span className="font-heading">{r.reference}</span>
        </div>
      ))}
    </div>
  )
}

export function ReadingsByLectionary({ readings }: ReadingsByLectionaryProps) {
  // Group readings by lectionary track
  const groups = new Map<string, Reading[]>()
  for (const r of readings) {
    const key = r.lectionary
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  // Filter to tracks that have readings, in canonical order
  const tracks = LECTIONARY_ORDER.filter((k) => groups.has(k))

  if (tracks.length === 0) return null

  // Single track — flat list, no tabs
  if (tracks.length === 1) {
    return <ReadingRows readings={groups.get(tracks[0])!} />
  }

  // Multiple tracks — tabs
  return (
    <Tabs defaultValue={tracks[0]}>
      <div className="px-4 pt-2">
        <TabsList className="h-7 bg-muted/50 p-0.5">
          {tracks.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="small-caps text-xs px-2.5 py-1 data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              {LECTIONARY_LABELS[key] ?? key}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tracks.map((key) => (
        <TabsContent key={key} value={key} className="mt-0">
          <ReadingRows readings={groups.get(key)!} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
