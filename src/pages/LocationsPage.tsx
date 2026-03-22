import { useEffect, useState } from 'react'
import {
  NavBar,
  SearchBar,
  List,
  SwipeAction,
  Empty,
  SpinLoading,
  FloatingBubble,
  Toast,
  Dialog,
} from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useLocationStore } from '@/stores/locationStore'
import LocationForm from '@/components/LocationForm'
import { LOCATION_TYPE_LABELS } from '@/types'
import type { Location } from '@/types'

export default function LocationsPage() {
  const {
    loadLocations,
    isLoading,
    searchQuery,
    setSearchQuery,
    getFilteredLocations,
    deleteLocation,
  } = useLocationStore()

  const [showForm, setShowForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | undefined>(undefined)

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  const filteredLocations = getFilteredLocations()

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await Dialog.confirm({
      content: '确认删除该地点？',
      confirmText: '删除',
      cancelText: '取消',
    })
    if (confirmed) {
      await deleteLocation(id)
      Toast.show({ icon: 'success', content: '已删除' })
    }
  }

  const handleAdd = () => {
    setEditingLocation(undefined)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingLocation(undefined)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar back={null} style={{ borderBottom: '1px solid #f0f0f0' }}>
        地点管理
      </NavBar>

      <div style={{ padding: '8px 12px' }}>
        <SearchBar
          placeholder="搜索地点名称或地址"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <SpinLoading />
          </div>
        ) : filteredLocations.length === 0 ? (
          <Empty description={searchQuery ? '没有匹配的地点' : '还没有地点，点击 + 添加'} />
        ) : (
          <List>
            {filteredLocations.map(location => (
              <SwipeAction
                key={location.id}
                rightActions={[
                  {
                    key: 'delete',
                    text: '删除',
                    color: 'danger',
                    onClick: () => void handleDelete(location.id!),
                  },
                ]}
              >
                <List.Item
                  prefix={
                    <span style={{ fontSize: '20px' }}>
                      {location.type === 'oil_well' ? '🛢️' :
                       location.type === 'warehouse' ? '🏭' :
                       location.type === 'gas_station' ? '⛽' : '📍'}
                    </span>
                  }
                  description={location.address || '未填写地址'}
                  extra={
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {LOCATION_TYPE_LABELS[location.type]}
                    </span>
                  }
                  onClick={() => handleEdit(location)}
                  clickable
                  arrow
                >
                  {location.name}
                </List.Item>
              </SwipeAction>
            ))}
          </List>
        )}
      </div>

      <FloatingBubble
        style={{ '--initial-position-bottom': '72px', '--initial-position-right': '16px' }}
        onClick={handleAdd}
      >
        <AddOutline fontSize={32} />
      </FloatingBubble>

      {showForm && (
        <LocationForm
          location={editingLocation}
          onClose={handleFormClose}
          onSaved={() => {
            handleFormClose()
            void loadLocations()
          }}
        />
      )}
    </div>
  )
}
