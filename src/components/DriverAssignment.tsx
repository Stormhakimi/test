import { useState } from 'react'
import { Card, List, Button, Picker, Tag, Toast } from 'antd-mobile'
import { optimizeRoute } from '@/lib/route-optimizer'
import type { DriverRoute, Location, Driver } from '@/types'
import { useSettingsStore } from '@/stores/settingsStore'

interface DriverAssignmentProps {
  driverRoutes: DriverRoute[]
  locationMap: Map<number, Location>
  driverMap: Map<number, Driver>
  onChange: (newRoutes: DriverRoute[]) => void
}

const formatDist = (m: number) => `${(m / 1000).toFixed(1)}公里`

export default function DriverAssignment({
  driverRoutes,
  locationMap,
  driverMap,
  onChange,
}: DriverAssignmentProps) {
  const { settings } = useSettingsStore()
  const [movingLoc, setMovingLoc] = useState<{ locId: number; fromDriverId: number } | null>(null)
  const [targetPickerVisible, setTargetPickerVisible] = useState(false)

  const handleStartMove = (locId: number, fromDriverId: number) => {
    setMovingLoc({ locId, fromDriverId })
    setTargetPickerVisible(true)
  }

  const handleMoveTo = (targetDriverId: number) => {
    if (!movingLoc || !settings.depotCoordinates) return

    const { locId, fromDriverId } = movingLoc
    if (targetDriverId === fromDriverId) {
      setMovingLoc(null)
      return
    }

    // Build coordinate map
    const coordMap: Record<number, [number, number]> = {}
    for (const [id, loc] of locationMap) {
      coordMap[id] = loc.coordinates
    }

    const newRoutes = driverRoutes.map(route => {
      if (route.driverId === fromDriverId) {
        // Remove location from this driver
        const newLocationIds = route.locationIds.filter(id => id !== locId)
        if (newLocationIds.length === 0) {
          return { ...route, locationIds: [], totalDistance: 0, totalTime: 0 }
        }
        const result = optimizeRoute({
          locationIds: newLocationIds,
          coordinates: coordMap,
          depotCoordinates: settings.depotCoordinates!,
          roundTrip: settings.defaultRoundTrip,
          constraints: [],
        })
        return {
          ...route,
          locationIds: result.orderedLocationIds,
          totalDistance: result.totalDistance,
          totalTime: Math.round(result.totalDistance / 10),
        }
      }
      if (route.driverId === targetDriverId) {
        // Add location to this driver
        const newLocationIds = [...route.locationIds, locId]
        const result = optimizeRoute({
          locationIds: newLocationIds,
          coordinates: coordMap,
          depotCoordinates: settings.depotCoordinates!,
          roundTrip: settings.defaultRoundTrip,
          constraints: [],
        })
        return {
          ...route,
          locationIds: result.orderedLocationIds,
          totalDistance: result.totalDistance,
          totalTime: Math.round(result.totalDistance / 10),
        }
      }
      return route
    })

    onChange(newRoutes)
    setMovingLoc(null)
    Toast.show({ icon: 'success', content: '调整完成，路线已重新计算' })
  }

  const otherDriverOptions = (currentDriverId: number) =>
    driverRoutes
      .filter(r => r.driverId !== currentDriverId)
      .map(r => ({
        label: driverMap.get(r.driverId)?.name ?? `司机${r.driverId}`,
        value: r.driverId,
      }))

  return (
    <div>
      {driverRoutes.map((route) => {
        const driver = driverMap.get(route.driverId)
        const driverName = driver?.name ?? `司机${route.driverId}`

        return (
          <Card
            key={route.driverId}
            title={driverName}
            extra={
              <Tag color="primary" fill="outline">
                {formatDist(route.totalDistance)}
              </Tag>
            }
            style={{ marginBottom: '12px', marginLeft: '12px', marginRight: '12px' }}
          >
            {route.locationIds.length === 0 ? (
              <p style={{ color: '#999', fontSize: '13px' }}>暂无分配</p>
            ) : (
              <List>
                {route.locationIds.map((locId, locIdx) => {
                  const loc = locationMap.get(locId)
                  return (
                    <List.Item
                      key={locId}
                      prefix={<span style={{ minWidth: '20px', fontSize: '13px' }}>{locIdx + 1}.</span>}
                      extra={
                        driverRoutes.length > 1 ? (
                          <Button
                            size="mini"
                            color="default"
                            fill="outline"
                            onClick={() => handleStartMove(locId, route.driverId)}
                          >
                            调整
                          </Button>
                        ) : null
                      }
                      description={loc?.address || undefined}
                    >
                      <span style={{ fontSize: '14px' }}>{loc?.name ?? `地点${locId}`}</span>
                    </List.Item>
                  )
                })}
              </List>
            )}
          </Card>
        )
      })}

      {/* Picker for selecting target driver */}
      {movingLoc && (
        <Picker
          columns={[otherDriverOptions(movingLoc.fromDriverId)]}
          visible={targetPickerVisible}
          title={`将 ${locationMap.get(movingLoc.locId)?.name ?? '该地点'} 调整给`}
          onClose={() => { setTargetPickerVisible(false); setMovingLoc(null) }}
          onConfirm={vals => {
            handleMoveTo(vals[0] as number)
            setTargetPickerVisible(false)
          }}
        />
      )}
    </div>
  )
}
