import { CheckList, Card } from 'antd-mobile'
import { useDriverStore } from '@/stores/driverStore'
import { useDispatchStore } from '@/stores/dispatchStore'
import { useSettingsStore } from '@/stores/settingsStore'

export default function StepDrivers() {
  const { drivers } = useDriverStore()
  const { selectedDriverIds, setSelectedDrivers } = useDispatchStore()
  const { settings } = useSettingsStore()

  const noDepot = !settings.depotCoordinates

  return (
    <div>
      {noDepot && (
        <Card
          style={{ margin: '12px', background: '#fffbe6', border: '1px solid #faad14' }}
          bodyStyle={{ padding: '12px', fontSize: '13px', color: '#8b6914' }}
        >
          ⚠️ 请先在设置中配置出发地坐标（车场位置），否则无法计算路线。
        </Card>
      )}

      <div style={{ padding: '8px 12px', fontSize: '13px', color: '#666' }}>
        已选 <strong>{selectedDriverIds.length}</strong> 名司机
      </div>

      <CheckList
        value={selectedDriverIds.map(String)}
        onChange={vals => setSelectedDrivers(vals.map(Number))}
      >
        {drivers.map(driver => (
          <CheckList.Item key={driver.id} value={String(driver.id)}>
            <div>🚗 {driver.name}</div>
            {driver.vehicleInfo && (
              <div style={{ fontSize: '12px', color: '#999' }}>{driver.vehicleInfo}</div>
            )}
          </CheckList.Item>
        ))}
      </CheckList>
    </div>
  )
}
