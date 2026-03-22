import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  validateConstraints,
  optimizeRoute,
} from './route-optimizer'
import type { OptimizationConfig } from '@/types'

// Test helpers
const makeCoords = (points: [number, number][]): Record<number, [number, number]> =>
  Object.fromEntries(points.map((p, i) => [i + 1, p]))

const DEPOT: [number, number] = [84.8, 45.5] // Karamay area

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance([84.8, 45.5], [84.8, 45.5])).toBe(0)
  })

  it('calculates distance between two points in meters', () => {
    // ~1 degree of latitude ≈ 111,000m
    const d = haversineDistance([84.8, 45.0], [84.8, 46.0])
    expect(d).toBeGreaterThan(100_000) // > 100km
    expect(d).toBeLessThan(120_000) // < 120km
  })
})

describe('validateConstraints', () => {
  it('returns true for empty constraints', () => {
    expect(validateConstraints([])).toBe(true)
  })

  it('returns true for valid chain (A→B→C)', () => {
    const constraints = [
      { type: 'must_before' as const, sourceId: 1, targetId: 2 },
      { type: 'must_before' as const, sourceId: 2, targetId: 3 },
    ]
    expect(validateConstraints(constraints)).toBe(true)
  })

  it('returns false for direct cycle (A before B, B before A)', () => {
    const constraints = [
      { type: 'must_before' as const, sourceId: 1, targetId: 2 },
      { type: 'must_before' as const, sourceId: 2, targetId: 1 },
    ]
    expect(validateConstraints(constraints)).toBe(false)
  })

  it('returns false for indirect cycle (A→B→C→A)', () => {
    const constraints = [
      { type: 'must_before' as const, sourceId: 1, targetId: 2 },
      { type: 'must_before' as const, sourceId: 2, targetId: 3 },
      { type: 'must_before' as const, sourceId: 3, targetId: 1 },
    ]
    expect(validateConstraints(constraints)).toBe(false)
  })
})

describe('optimizeRoute', () => {
  it('returns empty route for no locations', () => {
    const config: OptimizationConfig = {
      locationIds: [],
      coordinates: {},
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = optimizeRoute(config)
    expect(result.success).toBe(true)
    expect(result.orderedLocationIds).toEqual([])
    expect(result.totalDistance).toBe(0)
  })

  it('returns single location for single input', () => {
    const config: OptimizationConfig = {
      locationIds: [1],
      coordinates: { 1: [84.9, 45.6] },
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = optimizeRoute(config)
    expect(result.success).toBe(true)
    expect(result.orderedLocationIds).toEqual([1])
  })

  it('visits all locations', () => {
    const ids = [1, 2, 3, 4, 5]
    const coords = makeCoords([
      [84.8, 45.5],
      [84.85, 45.55],
      [84.9, 45.6],
      [84.95, 45.65],
      [85.0, 45.7],
    ])
    const config: OptimizationConfig = {
      locationIds: ids,
      coordinates: coords,
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = optimizeRoute(config)
    expect(result.success).toBe(true)
    expect(result.orderedLocationIds.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('respects must_before constraint', () => {
    // 5 locations in a circle; force location 5 to come before location 1
    const coords = makeCoords([
      [84.8, 45.5],
      [84.85, 45.5],
      [84.9, 45.5],
      [84.85, 45.55],
      [84.8, 45.55],
    ])
    const config: OptimizationConfig = {
      locationIds: [1, 2, 3, 4, 5],
      coordinates: coords,
      depotCoordinates: [84.85, 45.52],
      roundTrip: false,
      constraints: [{ type: 'must_before', sourceId: 5, targetId: 1 }],
    }
    const result = optimizeRoute(config)
    expect(result.success).toBe(true)
    const pos5 = result.orderedLocationIds.indexOf(5)
    const pos1 = result.orderedLocationIds.indexOf(1)
    expect(pos5).toBeLessThan(pos1)
  })

  it('returns error for conflicting constraints', () => {
    const config: OptimizationConfig = {
      locationIds: [1, 2],
      coordinates: { 1: [84.8, 45.5], 2: [84.9, 45.5] },
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [
        { type: 'must_before', sourceId: 1, targetId: 2 },
        { type: 'must_before', sourceId: 2, targetId: 1 },
      ],
    }
    const result = optimizeRoute(config)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('round-trip distance > one-way for same locations', () => {
    const coords = makeCoords([
      [84.9, 45.6],
      [84.95, 45.6],
    ])
    const base: OptimizationConfig = {
      locationIds: [1, 2],
      coordinates: coords,
      depotCoordinates: DEPOT,
      roundTrip: false,
      constraints: [],
    }
    const oneWay = optimizeRoute(base)
    const roundTrip = optimizeRoute({ ...base, roundTrip: true })
    expect(roundTrip.totalDistance).toBeGreaterThan(oneWay.totalDistance)
  })

  it('completes 20 locations in under 2 seconds', () => {
    // Use deterministic pseudo-random coordinates (seeded by index)
    const ids = Array.from({ length: 20 }, (_, i) => i + 1)
    const coords: Record<number, [number, number]> = {}
    for (let i = 0; i < 20; i++) {
      // Deterministic spread across Karamay region
      const lng = 84.5 + ((i * 7 + 3) % 20) * 0.05
      const lat = 45.0 + ((i * 11 + 5) % 20) * 0.05
      coords[i + 1] = [lng, lat]
    }
    const config: OptimizationConfig = {
      locationIds: ids,
      coordinates: coords,
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const start = Date.now()
    const result = optimizeRoute(config)
    const elapsed = Date.now() - start
    expect(result.success).toBe(true)
    expect(result.orderedLocationIds).toHaveLength(20)
    expect(elapsed).toBeLessThan(2000)
  })
})
