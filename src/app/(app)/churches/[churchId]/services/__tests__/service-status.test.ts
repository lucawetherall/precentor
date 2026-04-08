import { describe, it, expect } from 'vitest'
import { computeMusicStatus, computeRotaStatus } from '../lib/service-status'

describe('computeMusicStatus', () => {
  it('returns "empty" when there are no music slots', () => {
    expect(computeMusicStatus([])).toBe('empty')
  })

  it('returns "empty" when every slot has no content', () => {
    expect(
      computeMusicStatus([
        { hymnId: null, anthemId: null, freeText: null },
        { hymnId: null, anthemId: null, freeText: null },
      ])
    ).toBe('empty')
  })

  it('returns "partial" when some slots have content and others do not', () => {
    expect(
      computeMusicStatus([
        { hymnId: 'h1', anthemId: null, freeText: null },
        { hymnId: null, anthemId: null, freeText: null },
      ])
    ).toBe('partial')
  })

  it('returns "ready" when every slot has content', () => {
    expect(
      computeMusicStatus([
        { hymnId: 'h1', anthemId: null, freeText: null },
        { hymnId: null, anthemId: 'a1', freeText: null },
        { hymnId: null, anthemId: null, freeText: 'Plainsong' },
      ])
    ).toBe('ready')
  })
})

describe('computeRotaStatus', () => {
  it('returns "empty" when there are no confirmed rota entries', () => {
    expect(computeRotaStatus([])).toBe('empty')
  })

  it('returns "empty" when entries exist but none are confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: false, voicePart: 'SOPRANO' },
        { confirmed: false, voicePart: 'ALTO' },
      ])
    ).toBe('empty')
  })

  it('returns "partial" when at least one voice part has no confirmed singer', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: true, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        // BASS missing
      ])
    ).toBe('partial')
  })

  it('returns "ready" when every voice part has at least one confirmed singer', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: true, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        { confirmed: true, voicePart: 'BASS' },
      ])
    ).toBe('ready')
  })

  it('ignores unconfirmed entries when computing coverage', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: false, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        { confirmed: true, voicePart: 'BASS' },
      ])
    ).toBe('partial')
  })

  it('treats members with no voice part as not counting toward any part', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: null },
      ])
    ).toBe('empty')
  })
})
