import { useMemo, useState } from 'react'
import { Button, Tabs, Toast } from 'antd-mobile'
import { useDispatchStore } from '@/stores/dispatchStore'
import { useLocationStore } from '@/stores/locationStore'
import { useDriverStore } from '@/stores/driverStore'
import { useSettingsStore } from '@/stores/settingsStore'
import RouteMap from '@/components/RouteMap'
import DriverAssignment from '@/components/DriverAssignment'
import WeChatTextPreview from '@/components/WeChatTextPreview'
import { generateWeChatText } from '@/lib/wechat-text'
import { dispatchDb } from '@/lib/db'
import type { EnrichedDriverRoute, GenerateTextInput } from '@/lib/wechat-text'

export default function StepResults() {
  const { result, setResult, constraints } = useDispatchStore()
  const { locations } = useLocationStore()
  const { drivers } = useDriverStore()
  const { settings } = useSettingsStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const locationMap = useMemo(
    () => new Map(locations.filter(l => l.id !== undefined).map(l => [l.id!, l])),
    [locations],
  )

  const driverMap = useMemo(
    () => new Map(drivers.filter(d => d.id !== undefined).map(d => [d.id!, d])),
    [drivers],
  )

  if (!result) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
        等待路线计算...
      </div>
    )
  }

  const depotCoords = settings.depotCoordinates ?? [84.8, 45.5]

  const enrichedRoutes: EnrichedDriverRoute[] = result.driverRoutes.map(route => {
    const driver = driverMap.get(route.driverId)
    const orderedLocations = route.locationIds
      .map((locationId) => {
        const location = locationMap.get(locationId)
        if (!location) return null
        return {
          id: location.id!,
          name: location.name,
          type: location.type,
          address: location.address,
          notes: location.notes,
        }
      })
      .filter((location): location is NonNullable<typeof location> => location !== null)

    return {
      driver: {
        id: driver?.id ?? route.driverId,
        name: driver?.name ?? `司机${route.driverId}`,
        vehicleInfo: driver?.vehicleInfo ?? '',
      },
      orderedLocations,
      totalDistance: route.totalDistance,
      totalTime: route.totalTime,
      constraints,
    }
  })

  const today = new Date().toISOString().slice(0, 10)
  const textInput: GenerateTextInput = { date: today, routes: enrichedRoutes }
  const wechatText = generateWeChatText(textInput)

  const handleSave = async () => {
    if (saved) return
    setSaving(true)
    try {
      await dispatchDb.add({
        date: today,
        driverRoutes: result.driverRoutes,
        constraints,
        status: 'planned',
      })
      setSaved(true)
      Toast.show({ icon: 'success', content: '已保存到历史记录' })
    } catch {
      Toast.show({ icon: 'fail', content: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignmentChange = (newRoutes: typeof result.driverRoutes) => {
    setResult({ ...result, driverRoutes: newRoutes, calculatedAt: Date.now() })
    setSaved(false)
  }

  return (
    <div style={{ paddingBottom: '16px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <Button
          block
          color={saved ? 'default' : 'primary'}
          loading={saving}
          disabled={saved}
          onClick={() => void handleSave()}
        >
          {saved ? '✓ 已保存' : '💾 保存到历史记录'}
        </Button>
      </div>

      <Tabs style={{ marginTop: '8px' }}>
        <Tabs.Tab title="📍 路线地图" key="map">
          <div style={{ padding: '0 0 8px' }}>
            <RouteMap
              driverRoutes={result.driverRoutes}
              locationMap={locationMap}
              driverMap={driverMap}
              depotCoordinates={depotCoords}
              style={{ height: '350px' }}
            />
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="🚗 司机分配" key="assignment">
          <div style={{ padding: '12px' }}>
            <DriverAssignment
              driverRoutes={result.driverRoutes}
              locationMap={locationMap}
              driverMap={driverMap}
              onChange={handleAssignmentChange}
            />
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="📱 微信通知" key="wechat">
          <div style={{ padding: '12px' }}>
            <WeChatTextPreview text={wechatText} />
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  )
}
