import type { DispatchConstraint, OptimizationConfig, RouteResult } from '@/types'

// ─── Haversine Distance ────────────────────────────────────────────────────────

/**
 * Calculate great-circle distance between two GCJ-02 points.
 * @param a [longitude, latitude]
 * @param b [longitude, latitude]
 * @returns distance in meters
 */
export function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6_371_000 // Earth radius in meters
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// ─── Distance Matrix ────────────────────────────────────────────────────────────

/**
 * Build NxN distance matrix where matrix[i][j] = distance in meters
 * between nodes[i] and nodes[j]. Index 0 = depot.
 */
export function buildDistanceMatrix(
  allCoords: [number, number][], // allCoords[0] = depot, [1..N] = locations
): number[][] {
  const n = allCoords.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 0 : haversineDistance(allCoords[i], allCoords[j]),
    ),
  )
}

// ─── Constraint Validation ─────────────────────────────────────────────────────

/**
 * Validate that constraints form a valid DAG (no cycles).
 * Uses DFS cycle detection.
 */
export function validateConstraints(constraints: DispatchConstraint[]): boolean {
  if (constraints.length === 0) return true

  // Build adjacency list
  const adj = new Map<number, Set<number>>()
  for (const c of constraints) {
    if (!adj.has(c.sourceId)) adj.set(c.sourceId, new Set())
    adj.get(c.sourceId)!.add(c.targetId)
  }

  // DFS cycle detection
  const visited = new Set<number>()
  const inStack = new Set<number>()

  function hasCycle(node: number): boolean {
    if (inStack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node)
    inStack.add(node)
    for (const neighbor of adj.get(node) ?? []) {
      if (hasCycle(neighbor)) return true
    }
    inStack.delete(node)
    return false
  }

  const allNodes = new Set([
    ...constraints.map((c) => c.sourceId),
    ...constraints.map((c) => c.targetId),
  ])
  for (const node of allNodes) {
    if (hasCycle(node)) return false
  }
  return true
}

// ─── Nearest Neighbor with Constraints ────────────────────────────────────────

/**
 * Nearest-neighbor heuristic with constraint filtering.
 * @param matrix Distance matrix (index 0 = depot)
 * @param locationIds Original location IDs (parallel to matrix rows/cols 1..N)
 * @param constraints Must-before ordering constraints
 * @returns Ordered indices into matrix (1-based, not including depot)
 */
function nearestNeighborWithConstraints(
  matrix: number[][],
  locationIds: number[],
  constraints: DispatchConstraint[],
): number[] {
  const n = locationIds.length
  if (n === 0) return []

  // Build "must come before" requirement: mustComeAfter[id] = set of IDs that must precede id
  const mustComeAfter = new Map<number, Set<number>>()
  for (const c of constraints) {
    if (!mustComeAfter.has(c.targetId))
      mustComeAfter.set(c.targetId, new Set())
    mustComeAfter.get(c.targetId)!.add(c.sourceId)
  }

  const visited = new Set<number>() // location IDs visited
  const result: number[] = []
  let currentIdx = 0 // start at depot (index 0)

  while (result.length < n) {
    let bestIdx = -1
    let bestDist = Infinity

    for (let i = 0; i < n; i++) {
      const locId = locationIds[i]
      const matrixIdx = i + 1 // +1 because depot is at index 0

      if (visited.has(locId)) continue

      // Check if all prerequisites have been visited
      const prereqs = mustComeAfter.get(locId)
      if (prereqs) {
        const allPrereqsDone = [...prereqs].every((prereqId) =>
          visited.has(prereqId),
        )
        if (!allPrereqsDone) continue
      }

      const dist = matrix[currentIdx][matrixIdx]
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = matrixIdx
      }
    }

    if (bestIdx === -1) {
      // Constraints may be unsatisfiable for remaining nodes; fall back to any unvisited
      for (let i = 0; i < n; i++) {
        const locId = locationIds[i]
        const matrixIdx = i + 1
        if (
          !visited.has(locId) &&
          matrix[currentIdx][matrixIdx] < Infinity
        ) {
          bestIdx = matrixIdx
          break
        }
      }
    }

    if (bestIdx === -1) break // shouldn't happen with valid input

    const locId = locationIds[bestIdx - 1]
    visited.add(locId)
    result.push(bestIdx)
    currentIdx = bestIdx
  }

  return result
}

// ─── 2-opt Improvement ────────────────────────────────────────────────────────

/**
 * Calculate total route distance through the given ordered indices.
 */
function routeDistance(
  route: number[],
  matrix: number[][],
  depotIdx: number,
  roundTrip: boolean,
): number {
  if (route.length === 0) return 0
  let dist = matrix[depotIdx][route[0]]
  for (let i = 0; i < route.length - 1; i++) {
    dist += matrix[route[i]][route[i + 1]]
  }
  if (roundTrip) dist += matrix[route[route.length - 1]][depotIdx]
  return dist
}

/**
 * 2-opt local search to improve a route.
 * Returns improved route (better or equal total distance).
 */
function twoOptImprove(
  route: number[],
  matrix: number[][],
  depotIdx: number,
  roundTrip: boolean,
): number[] {
  let improved = true
  let best = [...route]
  let bestDist = routeDistance(best, matrix, depotIdx, roundTrip)

  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        // Reverse segment [i+1 .. j]
        const newRoute = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        const newDist = routeDistance(newRoute, matrix, depotIdx, roundTrip)
        if (newDist < bestDist - 0.001) {
          best = newRoute
          bestDist = newDist
          improved = true
        }
      }
    }
  }
  return best
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Optimize visit order for a single vehicle.
 * Uses Nearest Neighbor heuristic + 2-opt improvement.
 */
export function optimizeRoute(config: OptimizationConfig): RouteResult {
  const {
    locationIds,
    coordinates,
    depotCoordinates,
    roundTrip,
    constraints,
  } = config

  if (locationIds.length === 0) {
    return { orderedLocationIds: [], totalDistance: 0, success: true }
  }

  // Validate constraints
  if (!validateConstraints(constraints)) {
    return {
      orderedLocationIds: [],
      totalDistance: 0,
      success: false,
      error: '约束条件存在循环依赖，无法规划路线',
    }
  }

  // Build coordinate array: [depot, loc1, loc2, ...]
  const allCoords: [number, number][] = [
    depotCoordinates,
    ...locationIds.map((id) => coordinates[id]),
  ]

  const matrix = buildDistanceMatrix(allCoords)

  // Get initial route using nearest neighbor
  let routeIndices = nearestNeighborWithConstraints(
    matrix,
    locationIds,
    constraints,
  )

  // Improve with 2-opt (only if no constraints — 2-opt may violate ordering)
  if (constraints.length === 0 && routeIndices.length > 3) {
    routeIndices = twoOptImprove(routeIndices, matrix, 0, roundTrip)
  }

  const orderedLocationIds = routeIndices.map((idx) => locationIds[idx - 1])
  const totalDistance = routeDistance(routeIndices, matrix, 0, roundTrip)

  return {
    orderedLocationIds,
    totalDistance,
    success: true,
  }
}
