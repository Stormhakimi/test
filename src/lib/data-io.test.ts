import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { exportData, importData, validateExportData, readJsonFile } from './data-io'

beforeEach(async () => {
  await db.locations.clear()
  await db.drivers.clear()
  await db.dispatches.clear()
  await db.settings.clear()
})

describe('validateExportData', () => {
  it('returns true for valid export data', () => {
    const valid = {
      version: '1.0' as const,
      exportedAt: '2024-01-15T10:00:00Z',
      locations: [],
      drivers: [],
      dispatches: [],
      settings: [],
    }
    expect(validateExportData(valid)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(validateExportData(null)).toBe(false)
    expect(validateExportData({ version: '2.0', locations: [] })).toBe(false)
    expect(validateExportData('not an object')).toBe(false)
  })
})

describe('export and import round-trip', () => {
  it('exports and reimports all data correctly', async () => {
    // Seed data
    await db.locations.add({
      name: '油井A-01',
      type: 'oil_well',
      address: '克拉玛依市',
      coordinates: [84.889, 45.597],
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await db.drivers.add({
      name: '张三',
      phone: '13800138000',
      vehicleInfo: '皮卡',
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await db.settings.put({ key: 'amapKey', value: 'test_key' })

    // Export
    const exported = await exportData()
    expect(exported.version).toBe('1.0')
    expect(exported.locations).toHaveLength(1)
    expect(exported.drivers).toHaveLength(1)
    expect(exported.settings).toHaveLength(1)

    // Clear and import
    await db.locations.clear()
    await db.drivers.clear()
    await db.settings.clear()

    await importData(exported)

    // Verify restoration
    const restoredLocs = await db.locations.toArray()
    const restoredDrivers = await db.drivers.toArray()
    const restoredSettings = await db.settings.toArray()

    expect(restoredLocs).toHaveLength(1)
    expect(restoredLocs[0].name).toBe('油井A-01')
    expect(restoredDrivers).toHaveLength(1)
    expect(restoredDrivers[0].name).toBe('张三')
    expect(restoredSettings).toHaveLength(1)
    expect(restoredSettings[0].value).toBe('test_key')
  })
})

describe('readJsonFile', () => {
  it('throws for invalid JSON', async () => {
    const file = new File(['not json'], 'test.json', { type: 'application/json' })
    await expect(readJsonFile(file)).rejects.toThrow('JSON')
  })

  it('throws for wrong format', async () => {
    const file = new File([JSON.stringify({ foo: 'bar' })], 'test.json', { type: 'application/json' })
    await expect(readJsonFile(file)).rejects.toThrow('格式不正确')
  })
})
