export type ConstraintType = 'must_before'
export type DispatchStatus = 'planned' | 'completed'

export interface DispatchConstraint {
  type: ConstraintType
  /** ID of location that must come FIRST */
  sourceId: number
  /** ID of location that must come AFTER source */
  targetId: number
}

export interface DriverRoute {
  driverId: number
  /** Ordered array of location IDs (visit order) */
  locationIds: number[]
  /** Total distance in meters */
  totalDistance: number
  /** Total estimated time in seconds */
  totalTime: number
}

export interface Dispatch {
  id?: number
  /** Date string in YYYY-MM-DD format */
  date: string
  driverRoutes: DriverRoute[]
  constraints: DispatchConstraint[]
  status: DispatchStatus
  createdAt: number
}

export interface DraftDispatch {
  /** Currently selected location IDs for today's dispatch */
  selectedLocationIds: number[]
  /** Currently selected driver IDs */
  selectedDriverIds: number[]
  /** Constraints for this dispatch */
  constraints: DispatchConstraint[]
  /** Current wizard step (1-4) */
  currentStep: number
}
