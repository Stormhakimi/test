import { describe, it, expect } from 'vitest'
import { generateWeChatText, formatDistance, formatTime } from './wechat-text'
import type { GenerateTextInput } from './wechat-text'

const sampleInput: GenerateTextInput = {
  date: '2024-01-15',
  routes: [
    {
      driver: { id: 1, name: '张三', vehicleInfo: '京A12345 皮卡' },
      orderedLocations: [
        { id: 1, name: '油井A-01', type: 'oil_well', address: '克拉玛依市白碱滩区', notes: '' },
        { id: 2, name: '仓库B', type: 'warehouse', address: '克拉玛依市乌尔禾区', notes: '装货点' },
      ],
      totalDistance: 45_200,
      totalTime: 4_800,
      constraints: [{ type: 'must_before', sourceId: 1, targetId: 2 }],
    },
    {
      driver: { id: 2, name: '李四', vehicleInfo: '' },
      orderedLocations: [
        { id: 3, name: '加油站C', type: 'gas_station', address: '克拉玛依市独山子区', notes: '' },
      ],
      totalDistance: 28_000,
      totalTime: 3_000,
      constraints: [],
    },
  ],
}

describe('formatDistance', () => {
  it('formats meters under 1km', () => {
    expect(formatDistance(500)).toBe('500米')
  })

  it('formats km with one decimal', () => {
    expect(formatDistance(45_200)).toBe('45.2公里')
    expect(formatDistance(1000)).toBe('1.0公里')
  })
})

describe('formatTime', () => {
  it('formats minutes under 1 hour', () => {
    expect(formatTime(1800)).toBe('30分钟')
  })

  it('formats hours and minutes', () => {
    expect(formatTime(4800)).toBe('1小时20分')
  })

  it('formats exact hours', () => {
    expect(formatTime(7200)).toBe('2小时')
  })
})

describe('generateWeChatText', () => {
  it('returns no-dispatch message for empty routes', () => {
    const text = generateWeChatText({ date: '2024-01-15', routes: [] })
    expect(text).toContain('今日无调度任务')
    expect(text).toContain('2024-01-15')
  })

  it('includes date header', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('2024-01-15 调度安排')
  })

  it('includes all driver names', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('张三')
    expect(text).toContain('李四')
  })

  it('includes vehicle info in driver header', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('京A12345 皮卡')
  })

  it('includes numbered location list', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('油井A-01')
    expect(text).toContain('仓库B')
    expect(text).toContain('加油站C')
  })

  it('includes total distance for each driver', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('45.2公里')
    expect(text).toContain('28.0公里')
  })

  it('includes constraint notes', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('先到油井A-01，再到仓库B')
  })

  it('includes location addresses', () => {
    const text = generateWeChatText(sampleInput)
    expect(text).toContain('克拉玛依市白碱滩区')
  })
})
