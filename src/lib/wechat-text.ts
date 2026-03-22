import { LOCATION_TYPE_LABELS } from '@/types'
import type { DispatchConstraint } from '@/types'

// Enriched types for text generation (not stored in DB, built at generation time)
export interface LocationInfo {
  id: number
  name: string
  type: string // LocationType value
  address: string
  notes: string
}

export interface DriverInfo {
  id: number
  name: string
  vehicleInfo: string
}

export interface EnrichedDriverRoute {
  driver: DriverInfo
  orderedLocations: LocationInfo[]
  totalDistance: number // meters
  totalTime: number // seconds
  constraints: DispatchConstraint[]
}

export interface GenerateTextInput {
  date: string // YYYY-MM-DD
  routes: EnrichedDriverRoute[]
}

/**
 * Format meters to km string, e.g. 45200 → "45.2公里"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}米`
  return `${(meters / 1000).toFixed(1)}公里`
}

/**
 * Format seconds to Chinese time string, e.g. 4800 → "1小时20分"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (remainMinutes === 0) return `${hours}小时`
  return `${hours}小时${remainMinutes}分`
}

/**
 * Generate WeChat-ready dispatch text for all drivers.
 */
export function generateWeChatText(input: GenerateTextInput): string {
  if (input.routes.length === 0) {
    return `📋 ${input.date} 调度安排\n\n今日无调度任务。`
  }

  const lines: string[] = []
  lines.push(`📋 ${input.date} 调度安排`)
  lines.push('')

  for (const route of input.routes) {
    const { driver, orderedLocations, totalDistance, totalTime, constraints } = route

    // Driver header
    const vehicleStr = driver.vehicleInfo ? ` (${driver.vehicleInfo})` : ''
    lines.push(`🚗 ${driver.name}${vehicleStr}`)
    lines.push('━━━━━━━━━━━━━━━')

    if (orderedLocations.length === 0) {
      lines.push('  今日无任务')
    } else {
      const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

      orderedLocations.forEach((loc, idx) => {
        const num = idx < numbers.length ? numbers[idx] : `${idx + 1}.`
        const typeLabel =
          LOCATION_TYPE_LABELS[loc.type as keyof typeof LOCATION_TYPE_LABELS] ?? loc.type
        lines.push(`${num} ${loc.name} (${typeLabel})`)
        if (loc.address) lines.push(`   📍 ${loc.address}`)
        if (loc.notes) lines.push(`   💬 ${loc.notes}`)
      })

      // Stats
      lines.push(`📏 总里程: ${formatDistance(totalDistance)}`)
      if (totalTime > 0) lines.push(`⏱ 预计用时: ${formatTime(totalTime)}`)

      // Constraint notes
      const relevantConstraints = constraints.filter(
        (c) =>
          orderedLocations.some((l) => l.id === c.sourceId) &&
          orderedLocations.some((l) => l.id === c.targetId),
      )
      if (relevantConstraints.length > 0) {
        const notes = relevantConstraints
          .map((c) => {
            const src = orderedLocations.find((l) => l.id === c.sourceId)
            const tgt = orderedLocations.find((l) => l.id === c.targetId)
            if (src && tgt) return `先到${src.name}，再到${tgt.name}`
            return null
          })
          .filter(Boolean)
        if (notes.length > 0) lines.push(`💡 注意: ${notes.join('；')}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
