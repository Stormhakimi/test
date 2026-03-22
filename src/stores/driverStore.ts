import { create } from 'zustand'
import { driverDb } from '@/lib/db'
import type { Driver } from '@/types'

interface DriverState {
  drivers: Driver[]
  isLoading: boolean
  loadDrivers: () => Promise<void>
  addDriver: (data: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateDriver: (id: number, data: Partial<Omit<Driver, 'id' | 'createdAt'>>) => Promise<void>
  deleteDriver: (id: number) => Promise<void>
}

export const useDriverStore = create<DriverState>((set, get) => ({
  drivers: [],
  isLoading: false,

  loadDrivers: async () => {
    set({ isLoading: true })
    const drivers = await driverDb.getAll()
    set({ drivers, isLoading: false })
  },

  addDriver: async (data) => {
    const id = await driverDb.add(data)
    await get().loadDrivers()
    return id
  },

  updateDriver: async (id, data) => {
    await driverDb.update(id, data)
    await get().loadDrivers()
  },

  deleteDriver: async (id) => {
    await driverDb.delete(id)
    await get().loadDrivers()
  },
}))
