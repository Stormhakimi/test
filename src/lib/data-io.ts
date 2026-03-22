import { db } from './db'
import type { Location, Driver, Dispatch } from '@/types'
import type { Setting } from './db'

export interface ExportData {
  version: '1.0'
  exportedAt: string
  locations: Location[]
  drivers: Driver[]
  dispatches: Dispatch[]
  settings: Setting[]
}

/**
 * Export all database data as a JSON object.
 */
export async function exportData(): Promise<ExportData> {
  const [locations, drivers, dispatches, settings] = await Promise.all([
    db.locations.toArray(),
    db.drivers.toArray(),
    db.dispatches.toArray(),
    db.settings.toArray(),
  ])
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    locations,
    drivers,
    dispatches,
    settings,
  }
}

/**
 * Trigger browser download of a JSON file.
 */
export function downloadJson(data: ExportData, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Validate that a parsed object has the correct ExportData shape.
 */
export function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    d['version'] === '1.0' &&
    Array.isArray(d['locations']) &&
    Array.isArray(d['drivers']) &&
    Array.isArray(d['dispatches']) &&
    Array.isArray(d['settings'])
  )
}

/**
 * Import data from an ExportData object, replacing all existing data.
 */
export async function importData(data: ExportData): Promise<void> {
  await db.transaction('rw', [db.locations, db.drivers, db.dispatches, db.settings], async () => {
    await db.locations.clear()
    await db.drivers.clear()
    await db.dispatches.clear()
    await db.settings.clear()

    if (data.locations.length > 0) await db.locations.bulkAdd(data.locations)
    if (data.drivers.length > 0) await db.drivers.bulkAdd(data.drivers)
    if (data.dispatches.length > 0) await db.dispatches.bulkAdd(data.dispatches)
    if (data.settings.length > 0) await db.settings.bulkAdd(data.settings)
  })
}

/**
 * Read a File object and parse as JSON, returning ExportData or throwing.
 */
export async function readJsonFile(file: File): Promise<ExportData> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON 格式')
  }
  if (!validateExportData(parsed)) {
    throw new Error('文件格式不正确，请确认是油田调度助手导出的备份文件')
  }
  return parsed
}
