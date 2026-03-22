import { create } from 'zustand'
import { locationDb } from '@/lib/db'
import type { Location } from '@/types'

interface LocationState {
  locations: Location[]
  isLoading: boolean
  searchQuery: string
  // Actions
  loadLocations: () => Promise<void>
  addLocation: (data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateLocation: (id: number, data: Partial<Omit<Location, 'id' | 'createdAt'>>) => Promise<void>
  deleteLocation: (id: number) => Promise<void>
  setSearchQuery: (query: string) => void
  getFilteredLocations: () => Location[]
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  isLoading: false,
  searchQuery: '',

  loadLocations: async () => {
    set({ isLoading: true })
    const locations = await locationDb.getAll()
    set({ locations, isLoading: false })
  },

  addLocation: async (data) => {
    const id = await locationDb.add(data)
    await get().loadLocations()
    return id
  },

  updateLocation: async (id, data) => {
    await locationDb.update(id, data)
    await get().loadLocations()
  },

  deleteLocation: async (id) => {
    await locationDb.delete(id)
    await get().loadLocations()
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredLocations: () => {
    const { locations, searchQuery } = get()
    if (!searchQuery.trim()) return locations
    const lower = searchQuery.toLowerCase()
    return locations.filter(
      loc =>
        loc.name.toLowerCase().includes(lower) ||
        loc.address.toLowerCase().includes(lower),
    )
  },
}))
