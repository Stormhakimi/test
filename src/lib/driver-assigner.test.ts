import { describe, it, expect } from 'vitest'
import { assignDrivers } from './driver-assigner'
import type { AssignmentConfig } from '@/types'

const DEPOT: [number, number] = [84.8, 45.5]

// Helper: create coordinate map
const coords = (pts: [number, number][]): Record<number, [number, number]> =>
  Object.fromEntries(pts.map((p, i) => [i + 1, p]))

describe('assignDrivers', () => {
  it('handles empty location list', () => {
    const config: AssignmentConfig = {
      locationIds: [],
      driverIds: [1, 2],
      coordinates: {},
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    expect(result.driverRoutes).toHaveLength(0)
  })

  it('assigns all locations to single driver when only one driver', () => {
    const config: AssignmentConfig = {
      locationIds: [1, 2, 3, 4, 5],
      driverIds: [1],
      coordinates: coords([
        [84.80, 45.50], [84.85, 45.55], [84.90, 45.60],
        [84.95, 45.65], [85.00, 45.70],
      ]),
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    expect(result.driverRoutes).toHaveLength(1)
    expect(result.driverRoutes[0].locationIds).toHaveLength(5)
    expect(result.driverRoutes[0].locationIds.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('assigns to 2 drivers, all locations covered (no missing, no duplicates)', () => {
    const config: AssignmentConfig = {
      locationIds: [1, 2, 3, 4],
      driverIds: [1, 2],
      coordinates: coords([
        [84.80, 45.50], [84.85, 45.55], [84.90, 45.60], [84.95, 45.65],
      ]),
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    expect(result.driverRoutes).toHaveLength(2)
    const allAssigned = result.driverRoutes.flatMap(r => r.locationIds).sort()
    expect(allAssigned).toEqual([1, 2, 3, 4])
    // No duplicates
    const uniqueAssigned = new Set(allAssigned)
    expect(uniqueAssigned.size).toBe(4)
  })

  it('handles more drivers than locations (some drivers get empty routes)', () => {
    const config: AssignmentConfig = {
      locationIds: [1, 2],
      driverIds: [1, 2, 3],
      coordinates: coords([[84.80, 45.50], [84.85, 45.55]]),
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    const allAssigned = result.driverRoutes.flatMap(r => r.locationIds)
    expect(allAssigned.sort()).toEqual([1, 2])
    // At most 2 drivers have assignments (one driver gets nothing)
    const nonEmpty = result.driverRoutes.filter(r => r.locationIds.length > 0)
    expect(nonEmpty.length).toBeLessThanOrEqual(2)
  })

  it('respects must_before constraint (co-assigns and orders correctly)', () => {
    // L1 must come before L2 — they should be on the SAME driver
    const config: AssignmentConfig = {
      locationIds: [1, 2, 3, 4],
      driverIds: [1, 2],
      coordinates: coords([
        [84.80, 45.50], [84.85, 45.55], [84.90, 45.60], [84.95, 45.65],
      ]),
      depotCoordinates: DEPOT,
      roundTrip: false,
      constraints: [{ type: 'must_before', sourceId: 1, targetId: 2 }],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    // Find which driver has L1
    const routeWithL1 = result.driverRoutes.find(r => r.locationIds.includes(1))
    expect(routeWithL1).toBeDefined()
    // L2 must be in the same route
    expect(routeWithL1!.locationIds).toContain(2)
    // L1 must come before L2 in the ordered route
    const pos1 = routeWithL1!.locationIds.indexOf(1)
    const pos2 = routeWithL1!.locationIds.indexOf(2)
    expect(pos1).toBeLessThan(pos2)
  })

  it('returns error for conflicting constraints', () => {
    const config: AssignmentConfig = {
      locationIds: [1, 2],
      driverIds: [1, 2],
      coordinates: coords([[84.80, 45.50], [84.85, 45.55]]),
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [
        { type: 'must_before', sourceId: 1, targetId: 2 },
        { type: 'must_before', sourceId: 2, targetId: 1 },
      ],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('each driver route has totalDistance > 0 when they have locations', () => {
    const config: AssignmentConfig = {
      locationIds: [1, 2, 3],
      driverIds: [1, 2],
      coordinates: coords([
        [84.85, 45.55], [84.90, 45.60], [84.95, 45.65],
      ]),
      depotCoordinates: DEPOT,
      roundTrip: true,
      constraints: [],
    }
    const result = assignDrivers(config)
    expect(result.success).toBe(true)
    for (const route of result.driverRoutes) {
      if (route.locationIds.length > 0) {
        expect(route.totalDistance).toBeGreaterThan(0)
      }
    }
  })
})
