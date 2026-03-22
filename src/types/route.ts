import type { DispatchConstraint, DriverRoute } from './dispatch'

export interface OptimizationConfig {
  /** Location IDs to visit */
  locationIds: number[]
  /** GCJ-02 coordinates for each location, indexed by location ID */
  coordinates: Record<number, [number, number]>
  /** Depot (starting point) GCJ-02 coordinates [longitude, latitude] */
  depotCoordinates: [number, number]
  /** Whether drivers return to depot after last stop */
  roundTrip: boolean
  /** Ordering constraints */
  constraints: DispatchConstraint[]
}

export interface RouteResult {
  /** Ordered location IDs (optimal visit order) */
  orderedLocationIds: number[]
  /** Total estimated distance in meters (Haversine) */
  totalDistance: number
  /** Whether calculation succeeded */
  success: boolean
  /** Error message if constraints were invalid */
  error?: string
}

export interface AssignmentConfig {
  locationIds: number[]
  driverIds: number[]
  coordinates: Record<number, [number, number]>
  depotCoordinates: [number, number]
  roundTrip: boolean
  constraints: DispatchConstraint[]
}

export interface AssignmentResult {
  /** Driver routes (one per driver) */
  driverRoutes: DriverRoute[]
  success: boolean
  error?: string
}
