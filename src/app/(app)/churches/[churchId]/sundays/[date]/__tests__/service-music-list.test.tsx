import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServiceMusicList } from '../service-music-list'
import type { PopulatedMusicSlot } from '@/types/service-views'

const hymnSlot: PopulatedMusicSlot = {
  id: '1', slotType: 'HYMN', positionOrder: 1,
  freeText: null, notes: null,
  hymnBook: 'NEH', hymnNumber: 270,
  hymnFirstLine: 'When I survey the wondrous cross',
  hymnTuneName: 'ROCKINGHAM',
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

const anthemSlot: PopulatedMusicSlot = {
  id: '2', slotType: 'ANTHEM', positionOrder: 2,
  freeText: null, notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: 'O vos omnes', anthemComposer: 'Victoria', anthemVoicing: 'SATB',
}

const emptySlot: PopulatedMusicSlot = {
  id: '3', slotType: 'ORGAN_VOLUNTARY_PRE', positionOrder: 3,
  freeText: null, notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

const freeTextSlot: PopulatedMusicSlot = {
  id: '4', slotType: 'OTHER', positionOrder: 4,
  freeText: 'Nunc Dimittis (plainsong)', notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

describe('ServiceMusicList', () => {
  it('renders a hymn with book, number, and first line', () => {
    render(<ServiceMusicList slots={[hymnSlot]} />)
    expect(screen.getByText(/NEH 270/)).toBeInTheDocument()
    expect(screen.getByText(/When I survey the wondrous cross/)).toBeInTheDocument()
  })

  it('renders an anthem with title and composer detail', () => {
    render(<ServiceMusicList slots={[anthemSlot]} />)
    expect(screen.getByText('O vos omnes')).toBeInTheDocument()
    expect(screen.getByText(/Victoria/)).toBeInTheDocument()
  })

  it('renders an empty slot as "Not yet assigned"', () => {
    render(<ServiceMusicList slots={[emptySlot]} />)
    expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
  })

  it('renders freeText slots by their freeText value', () => {
    render(<ServiceMusicList slots={[freeTextSlot]} />)
    expect(screen.getByText('Nunc Dimittis (plainsong)')).toBeInTheDocument()
  })

  it('renders an empty state when no slots are provided', () => {
    render(<ServiceMusicList slots={[]} />)
    expect(screen.getByText(/No music planned/)).toBeInTheDocument()
  })
})
