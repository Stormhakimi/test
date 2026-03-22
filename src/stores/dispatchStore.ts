import { create } from 'zustand'
import type { DispatchConstraint, DriverRoute } from '@/types'

export interface DispatchResult {
  driverRoutes: DriverRoute[]
  calculatedAt: number
}

interface DispatchState {
  // Step tracking
  currentStep: number
  // Step 1: Selected locations
  selectedLocationIds: number[]
  // Step 2: Constraints
  constraints: DispatchConstraint[]
  // Step 3: Selected drivers
  selectedDriverIds: number[]
  // Step 4: Results
  result: DispatchResult | null
  isCalculating: boolean
  calculationError: string | null

  // Actions
  setCurrentStep: (step: number) => void
  setSelectedLocations: (ids: number[]) => void
  toggleLocation: (id: number) => void
  setConstraints: (constraints: DispatchConstraint[]) => void
  addConstraint: (constraint: DispatchConstraint) => void
  removeConstraint: (index: number) => void
  setSelectedDrivers: (ids: number[]) => void
  toggleDriver: (id: number) => void
  setResult: (result: DispatchResult | null) => void
  setIsCalculating: (v: boolean) => void
  setCalculationError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  currentStep: 1,
  selectedLocationIds: [],
  constraints: [],
  selectedDriverIds: [],
  result: null,
  isCalculating: false,
  calculationError: null,
}

export const useDispatchStore = create<DispatchState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  setSelectedLocations: (ids) => set({ selectedLocationIds: ids }),

  toggleLocation: (id) => {
    const { selectedLocationIds } = get()
    set({
      selectedLocationIds: selectedLocationIds.includes(id)
        ? selectedLocationIds.filter(x => x !== id)
        : [...selectedLocationIds, id],
    })
  },

  setConstraints: (constraints) => set({ constraints }),

  addConstraint: (constraint) =>
    set(state => ({ constraints: [...state.constraints, constraint] })),

  removeConstraint: (index) =>
    set(state => ({ constraints: state.constraints.filter((_, i) => i !== index) })),

  setSelectedDrivers: (ids) => set({ selectedDriverIds: ids }),

  toggleDriver: (id) => {
    const { selectedDriverIds } = get()
    set({
      selectedDriverIds: selectedDriverIds.includes(id)
        ? selectedDriverIds.filter(x => x !== id)
        : [...selectedDriverIds, id],
    })
  },

  setResult: (result) => set({ result }),
  setIsCalculating: (v) => set({ isCalculating: v }),
  setCalculationError: (error) => set({ calculationError: error }),
  reset: () => set(initialState),
}))
