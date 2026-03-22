import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, locationDb, driverDb, dispatchDb, settingsDb } from './db'

beforeEach(async () => {
  await db.locations.clear()
  await db.drivers.clear()
  await db.dispatches.clear()
  await db.settings.clear()
})

// ─── Location Tests ────────────────────────────────────────────────────────────

describe('locationDb', () => {
  it('add returns a numeric id', async () => {
    const id = await locationDb.add({
      name: '油井A-01',
      type: 'oil_well',
      address: '新疆克拉玛依市',
      coordinates: [84.889, 45.597],
      notes: '',
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('getById returns correct record', async () => {
    const id = await locationDb.add({
      name: '仓库B',
      type: 'warehouse',
      address: '克拉玛依白碱滩区',
      coordinates: [84.9, 45.6],
      notes: '主仓库',
    })
    const loc = await locationDb.getById(id)
    expect(loc).toBeDefined()
    expect(loc!.name).toBe('仓库B')
    expect(loc!.type).toBe('warehouse')
    expect(loc!.coordinates).toEqual([84.9, 45.6])
  })

  it('update changes fields and updatedAt', async () => {
    const id = await locationDb.add({
      name: '加油站C',
      type: 'gas_station',
      address: '老城区',
      coordinates: [84.8, 45.5],
      notes: '',
    })
    const before = await locationDb.getById(id)
    await new Promise(r => setTimeout(r, 5)) // ensure time difference
    await locationDb.update(id, { name: '加油站C-更新', notes: '已更新' })
    const after = await locationDb.getById(id)
    expect(after!.name).toBe('加油站C-更新')
    expect(after!.notes).toBe('已更新')
    expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt)
  })

  it('delete removes the record', async () => {
    const id = await locationDb.add({
      name: '临时点',
      type: 'other',
      address: '',
      coordinates: [84.0, 45.0],
      notes: '',
    })
    await locationDb.delete(id)
    const result = await locationDb.getById(id)
    expect(result).toBeUndefined()
  })

  it('search finds by name (case-insensitive)', async () => {
    await locationDb.add({ name: '油井A-01', type: 'oil_well', address: '区域一', coordinates: [84.8, 45.5], notes: '' })
    await locationDb.add({ name: '仓库B', type: 'warehouse', address: '区域二', coordinates: [84.9, 45.6], notes: '' })
    await locationDb.add({ name: '油井B-03', type: 'oil_well', address: '区域三', coordinates: [85.0, 45.7], notes: '' })
    
    const results = await locationDb.search('油井')
    expect(results).toHaveLength(2)
    expect(results.every(r => r.name.includes('油井'))).toBe(true)
  })

  it('search finds by address substring', async () => {
    await locationDb.add({ name: '点A', type: 'other', address: '克拉玛依市中心', coordinates: [84.8, 45.5], notes: '' })
    await locationDb.add({ name: '点B', type: 'other', address: '乌鲁木齐市', coordinates: [87.6, 43.8], notes: '' })
    
    const results = await locationDb.search('克拉玛依')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('点A')
  })

  it('concurrent adds all succeed without data loss', async () => {
    const adds = Array.from({ length: 5 }, (_, i) =>
      locationDb.add({
        name: `并发测试点${i + 1}`,
        type: 'other',
        address: `地址${i + 1}`,
        coordinates: [84.0 + i * 0.1, 45.0],
        notes: '',
      })
    )
    const ids = await Promise.all(adds)
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5) // all unique
    const all = await locationDb.getAll()
    expect(all).toHaveLength(5)
  })
})

// ─── Driver Tests ──────────────────────────────────────────────────────────────

describe('driverDb', () => {
  it('add and getById work correctly', async () => {
    const id = await driverDb.add({
      name: '张三',
      phone: '13800138000',
      vehicleInfo: '京A12345 皮卡',
      notes: '',
    })
    const driver = await driverDb.getById(id)
    expect(driver!.name).toBe('张三')
    expect(driver!.phone).toBe('13800138000')
  })

  it('update changes fields', async () => {
    const id = await driverDb.add({ name: '李四', phone: '13900139000', vehicleInfo: '', notes: '' })
    await driverDb.update(id, { phone: '13700137000' })
    const d = await driverDb.getById(id)
    expect(d!.phone).toBe('13700137000')
  })

  it('delete removes driver', async () => {
    const id = await driverDb.add({ name: '王五', phone: '', vehicleInfo: '', notes: '' })
    await driverDb.delete(id)
    expect(await driverDb.getById(id)).toBeUndefined()
  })
})

// ─── Dispatch Tests ────────────────────────────────────────────────────────────

describe('dispatchDb', () => {
  it('add and getById work', async () => {
    const id = await dispatchDb.add({
      date: '2024-01-15',
      driverRoutes: [{ driverId: 1, locationIds: [1, 2], totalDistance: 50000, totalTime: 3600 }],
      constraints: [],
      status: 'planned',
    })
    const d = await dispatchDb.getById(id)
    expect(d!.date).toBe('2024-01-15')
    expect(d!.status).toBe('planned')
  })

  it('getByDate finds correct record', async () => {
    await dispatchDb.add({ date: '2024-01-14', driverRoutes: [], constraints: [], status: 'planned' })
    await dispatchDb.add({ date: '2024-01-15', driverRoutes: [], constraints: [], status: 'planned' })
    const found = await dispatchDb.getByDate('2024-01-15')
    expect(found).toBeDefined()
    expect(found!.date).toBe('2024-01-15')
  })
})

// ─── Settings Tests ────────────────────────────────────────────────────────────

describe('settingsDb', () => {
  it('set and get a value', async () => {
    await settingsDb.set('amapKey', 'test_key_abc123')
    const val = await settingsDb.get('amapKey')
    expect(val).toBe('test_key_abc123')
  })

  it('getAll returns all settings as record', async () => {
    await settingsDb.set('key1', 'value1')
    await settingsDb.set('key2', 'value2')
    const all = await settingsDb.getAll()
    expect(all['key1']).toBe('value1')
    expect(all['key2']).toBe('value2')
  })

  it('delete removes a setting', async () => {
    await settingsDb.set('tempKey', 'tempVal')
    await settingsDb.delete('tempKey')
    expect(await settingsDb.get('tempKey')).toBeUndefined()
  })
})
