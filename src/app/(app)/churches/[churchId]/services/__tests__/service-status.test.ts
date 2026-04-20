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
  it('returns "empty" when there are no rota entries', () => {
    expect(computeRotaStatus([])).toBe('empty')
  })

  it('returns "empty" when entries exist but none are confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: false },
        { confirmed: false },
      ])
    ).toBe('empty')
  })

  it('returns "partial" when some entries are confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: true },
        { confirmed: false },
      ])
    ).toBe('partial')
  })

  it('returns "partial" when at least one entry is confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: true },
        { confirmed: true },
        { confirmed: true },
        { confirmed: false },
      ])
    ).toBe('partial')
  })

  it('returns "partial" when all entries are confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: true },
        { confirmed: true },
        { confirmed: true },
        { confirmed: true },
      ])
    ).toBe('partial')
  })
})
