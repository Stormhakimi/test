import { create } from 'zustand'
import { settingsDb } from '@/lib/db'
import type { AppSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  saveAmapKey: (key: string) => Promise<void>
  saveDepot: (address: string, coordinates: [number, number]) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoaded: false,

  loadSettings: async () => {
    const all = await settingsDb.getAll()
    const settings: AppSettings = { ...DEFAULT_SETTINGS }
    if (all['amapKey']) settings.amapKey = all['amapKey']
    if (all['depotAddress']) settings.depotAddress = all['depotAddress']
    if (all['depotCoordinates']) {
      try {
        settings.depotCoordinates = JSON.parse(all['depotCoordinates']) as [number, number]
      } catch {
        // ignore parse error
      }
    }
    if (all['defaultRoundTrip'] !== undefined) {
      settings.defaultRoundTrip = all['defaultRoundTrip'] === 'true'
    }
    set({ settings, isLoaded: true })
  },

  updateSetting: async (key, value) => {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)
    await settingsDb.set(key, serialized)
    set(state => ({
      settings: { ...state.settings, [key]: value },
    }))
  },

  saveAmapKey: async (key) => {
    await settingsDb.set('amapKey', key)
    set(state => ({ settings: { ...state.settings, amapKey: key } }))
  },

  saveDepot: async (address, coordinates) => {
    await settingsDb.set('depotAddress', address)
    await settingsDb.set('depotCoordinates', JSON.stringify(coordinates))
    set(state => ({
      settings: { ...state.settings, depotAddress: address, depotCoordinates: coordinates },
    }))
  },
}))
