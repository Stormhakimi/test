import { CheckList, SearchBar, Tag } from 'antd-mobile'
import { useLocationStore } from '@/stores/locationStore'
import { useDispatchStore } from '@/stores/dispatchStore'
import { LOCATION_TYPE_LABELS } from '@/types'

export default function StepLocations() {
  const { searchQuery, setSearchQuery, getFilteredLocations } = useLocationStore()
  const { selectedLocationIds, setSelectedLocations } = useDispatchStore()
  const locations = getFilteredLocations()

  return (
    <div>
      <div style={{ padding: '8px 12px' }}>
        <SearchBar
          placeholder="搜索地点"
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
          已选 <strong>{selectedLocationIds.length}</strong> 个地点
        </div>
      </div>

      <CheckList
        value={selectedLocationIds.map(String)}
        onChange={vals => setSelectedLocations(vals.map(Number))}
      >
        {locations.map(loc => (
          <CheckList.Item key={loc.id} value={String(loc.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>
                {loc.type === 'oil_well' ? '🛢️' :
                 loc.type === 'warehouse' ? '🏭' :
                 loc.type === 'gas_station' ? '⛽' : '📍'}
              </span>
              <span style={{ flex: 1 }}>{loc.name}</span>
              <Tag color="primary" fill="outline" style={{ fontSize: '11px' }}>
                {LOCATION_TYPE_LABELS[loc.type]}
              </Tag>
            </div>
            {loc.address && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{loc.address}</div>}
          </CheckList.Item>
        ))}
      </CheckList>
    </div>
  )
}
