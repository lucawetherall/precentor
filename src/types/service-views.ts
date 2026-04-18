import type { LiturgicalSeason, LiturgicalColour, MusicSlotType } from '@/types'

export interface MusicSlotPreview {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  title: string  // resolved from hymn.firstLine, anthem.title, or freeText
}

export interface ServiceSummary {
  id: string
  serviceType: string
  time: string | null
  status: string
  choirStatus: string
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  musicPreview: MusicSlotPreview[]
}

export interface LiturgicalDayWithService {
  id: string
  date: string       // "YYYY-MM-DD"
  cwName: string
  season: LiturgicalSeason
  colour: LiturgicalColour
  collect: string | null
  service: ServiceSummary | null
}

export interface AdjacentDayLinks {
  prev: string | null
  next: string | null
}

export interface PopulatedMusicSlot {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  freeText: string | null
  notes: string | null
  hymnBook: string | null
  hymnNumber: number | null
  hymnFirstLine: string | null
  hymnTuneName: string | null
  anthemTitle: string | null
  anthemComposer: string | null
  anthemVoicing: string | null
}
