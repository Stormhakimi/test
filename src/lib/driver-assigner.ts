import { validateConstraints, optimizeRoute, haversineDistance } from './route-optimizer'
import type { AssignmentConfig, AssignmentResult, DriverRoute, DispatchConstraint } from '@/types'

/**
 * Assign locations to drivers using Clarke-Wright Savings algorithm.
 * Then optimizes each driver's route using nearest-neighbor + 2-opt.
 */
export function assignDrivers(config: AssignmentConfig): AssignmentResult {
  const { locationIds, driverIds, coordinates, depotCoordinates, roundTrip, constraints } = config

  if (locationIds.length === 0) {
    return { driverRoutes: [], success: true }
  }

  if (driverIds.length === 0) {
    return { driverRoutes: [], success: false, error: '没有可用的司机' }
  }

  // Validate constraints
  if (!validateConstraints(constraints)) {
    return {
      driverRoutes: [],
      success: false,
      error: '约束条件存在循环依赖，无法规划路线',
    }
  }

  // Determine required co-locations: locations that must be on the same route
  const coGroups = buildCoGroups(locationIds, constraints)

  // If we have more groups than drivers, some groups merge
  const numDrivers = Math.min(driverIds.length, coGroups.length)

  // Merge groups down to numDrivers using Clarke-Wright savings
  const mergedGroups = mergeGroupsWithSavings(coGroups, coordinates, depotCoordinates, numDrivers)

  // Optimize each group's route
  const driverRoutes: DriverRoute[] = []

  mergedGroups.forEach((group, idx) => {
    if (group.length === 0) return // skip empty groups

    const driverId = driverIds[idx]

    // Get the constraints relevant to this group
    const groupConstraints = constraints.filter(
      c => group.includes(c.sourceId) && group.includes(c.targetId),
    )

    const routeResult = optimizeRoute({
      locationIds: group,
      coordinates,
      depotCoordinates,
      roundTrip,
      constraints: groupConstraints,
    })

    driverRoutes.push({
      driverId,
      locationIds: routeResult.orderedLocationIds,
      totalDistance: routeResult.totalDistance,
      totalTime: Math.round(routeResult.totalDistance / 10), // rough estimate: 10m/s ≈ 36km/h
    })
  })

  return { driverRoutes, success: true }
}

// ─── Co-location Groups (Union-Find) ─────────────────────────────────────────

/**
 * Build co-location groups: locations connected by constraints must be in the same group.
 * Initially each location is its own group, then merge based on must_before constraints.
 */
function buildCoGroups(
  locationIds: number[],
  constraints: DispatchConstraint[],
): number[][] {
  // Union-Find to group constrained locations
  const parent = new Map<number, number>()
  locationIds.forEach(id => parent.set(id, id))

  function find(id: number): number {
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!))
    }
    return parent.get(id)!
  }

  function union(a: number, b: number): void {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  // Merge constrained locations into same group
  for (const c of constraints) {
    if (locationIds.includes(c.sourceId) && locationIds.includes(c.targetId)) {
      union(c.sourceId, c.targetId)
    }
  }

  // Collect groups
  const groups = new Map<number, number[]>()
  locationIds.forEach(id => {
    const root = find(id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(id)
  })

  return [...groups.values()]
}

// ─── Clarke-Wright Savings Merge ──────────────────────────────────────────────

/**
 * Compute centroid of a group of locations.
 */
function centroid(
  group: number[],
  coordinates: Record<number, [number, number]>,
): [number, number] {
  const lngs = group.map(id => coordinates[id][0])
  const lats = group.map(id => coordinates[id][1])
  return [
    lngs.reduce((a, b) => a + b, 0) / lngs.length,
    lats.reduce((a, b) => a + b, 0) / lats.length,
  ]
}

/**
 * Merge co-groups down to targetCount using Clarke-Wright savings.
 * Groups with most savings to merge are merged first.
 */
function mergeGroupsWithSavings(
  groups: number[][],
  coordinates: Record<number, [number, number]>,
  depotCoordinates: [number, number],
  targetCount: number,
): number[][] {
  if (groups.length <= targetCount) return groups

  let current = [...groups]

  while (current.length > targetCount) {
    let bestI = -1
    let bestJ = -1
    let bestSaving = -Infinity

    // Clarke-Wright: savings(i,j) = d(depot,ci) + d(depot,cj) - d(ci,cj)
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const ci = centroid(current[i], coordinates)
        const cj = centroid(current[j], coordinates)
        const saving =
          haversineDistance(depotCoordinates, ci) +
          haversineDistance(depotCoordinates, cj) -
          haversineDistance(ci, cj)
        if (saving > bestSaving) {
          bestSaving = saving
          bestI = i
          bestJ = j
        }
      }
    }

    if (bestI === -1) break

    // Merge groups bestI and bestJ
    const merged = [...current[bestI], ...current[bestJ]]
    current = current.filter((_, idx) => idx !== bestI && idx !== bestJ)
    current.push(merged)
  }

  return current
}
