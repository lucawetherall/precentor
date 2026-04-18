import type { LiturgicalSeason, LiturgicalColour, MusicSlotType } from '@/types'

export interface MusicSlotPreview {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  title: string  // resolved from hymn.firstLine, anthem.title, or freeText
}

export type ServiceReadinessStatus = 'empty' | 'partial' | 'ready'

export interface ServiceSummary {
  id: string
  serviceType: string
  time: string | null
  status: string
  choirStatus: string
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  musicPreview: MusicSlotPreview[]
  musicStatus: ServiceReadinessStatus
  rotaStatus: ServiceReadinessStatus
}

export interface LiturgicalDayWithService {
  id: string
  date: string       // "YYYY-MM-DD"
  cwName: string
  season: LiturgicalSeason
  colour: LiturgicalColour
  collect: string | null
  services: ServiceSummary[]
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
