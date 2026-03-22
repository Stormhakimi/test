import Dexie, { type EntityTable } from 'dexie'
import type { Location, Driver, Dispatch } from '@/types'

// Re-export Setting type (not in @/types by design)
export interface Setting {
  key: string
  value: string
}

export class AppDatabase extends Dexie {
  locations!: EntityTable<Location, 'id'>
  drivers!: EntityTable<Driver, 'id'>
  dispatches!: EntityTable<Dispatch, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('OilFieldDispatch')
    this.version(1).stores({
      locations: '++id, name, type, createdAt',
      drivers: '++id, name, createdAt',
      dispatches: '++id, date, status, createdAt',
      settings: 'key',
    })
  }
}

export const db = new AppDatabase()

// Location CRUD
export const locationDb = {
  async add(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = Date.now()
    return (await db.locations.add({ ...data, createdAt: now, updatedAt: now } as Location)) as number
  },
  async update(id: number, data: Partial<Omit<Location, 'id' | 'createdAt'>>): Promise<void> {
    await db.locations.update(id, { ...data, updatedAt: Date.now() })
  },
  async delete(id: number): Promise<void> {
    await db.locations.delete(id)
  },
  async getById(id: number): Promise<Location | undefined> {
    return db.locations.get(id)
  },
  async getAll(): Promise<Location[]> {
    return db.locations.orderBy('createdAt').reverse().toArray()
  },
  async search(query: string): Promise<Location[]> {
    const lower = query.toLowerCase()
    return db.locations
      .filter(loc => loc.name.toLowerCase().includes(lower) || loc.address.toLowerCase().includes(lower))
      .toArray()
  },
}

// Driver CRUD
export const driverDb = {
  async add(data: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = Date.now()
    return (await db.drivers.add({ ...data, createdAt: now, updatedAt: now } as Driver)) as number
  },
  async update(id: number, data: Partial<Omit<Driver, 'id' | 'createdAt'>>): Promise<void> {
    await db.drivers.update(id, { ...data, updatedAt: Date.now() })
  },
  async delete(id: number): Promise<void> {
    await db.drivers.delete(id)
  },
  async getById(id: number): Promise<Driver | undefined> {
    return db.drivers.get(id)
  },
  async getAll(): Promise<Driver[]> {
    return db.drivers.orderBy('createdAt').reverse().toArray()
  },
}

// Dispatch CRUD
export const dispatchDb = {
  async add(data: Omit<Dispatch, 'id' | 'createdAt'>): Promise<number> {
    return (await db.dispatches.add({ ...data, createdAt: Date.now() } as Dispatch)) as number
  },
  async update(id: number, data: Partial<Omit<Dispatch, 'id' | 'createdAt'>>): Promise<void> {
    await db.dispatches.update(id, data)
  },
  async delete(id: number): Promise<void> {
    await db.dispatches.delete(id)
  },
  async getById(id: number): Promise<Dispatch | undefined> {
    return db.dispatches.get(id)
  },
  async getAll(): Promise<Dispatch[]> {
    return db.dispatches.orderBy('createdAt').reverse().toArray()
  },
  async getByDate(date: string): Promise<Dispatch | undefined> {
    return db.dispatches.where('date').equals(date).first()
  },
}

// Settings CRUD
export const settingsDb = {
  async get(key: string): Promise<string | undefined> {
    const setting = await db.settings.get(key)
    return setting?.value
  },
  async set(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value })
  },
  async getAll(): Promise<Record<string, string>> {
    const all = await db.settings.toArray()
    return Object.fromEntries(all.map(s => [s.key, s.value]))
  },
  async delete(key: string): Promise<void> {
    await db.settings.delete(key)
  },
}
