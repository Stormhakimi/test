import { useEffect, useState } from 'react'
import {
  NavBar,
  List,
  SwipeAction,
  FloatingBubble,
  Toast,
  Dialog,
  Empty,
  SpinLoading,
} from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useDriverStore } from '@/stores/driverStore'
import DriverForm from '@/components/DriverForm'
import type { Driver } from '@/types'

export default function DriversPage() {
  const { drivers, isLoading, loadDrivers, deleteDriver } = useDriverStore()
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined)

  useEffect(() => {
    void loadDrivers()
  }, [loadDrivers])

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await Dialog.confirm({
      content: '确认删除该司机？',
      confirmText: '删除',
      cancelText: '取消',
    })
    if (confirmed) {
      await deleteDriver(id)
      Toast.show({ icon: 'success', content: '已删除' })
    }
  }

  const handleAdd = () => {
    setEditingDriver(undefined)
    setShowForm(true)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar back={null} style={{ borderBottom: '1px solid #f0f0f0' }}>
        司机管理
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <SpinLoading />
          </div>
        ) : drivers.length === 0 ? (
          <Empty description="还没有司机，点击 + 添加" />
        ) : (
          <List>
            {drivers.map(driver => (
              <SwipeAction
                key={driver.id}
                rightActions={[
                  {
                    key: 'delete',
                    text: '删除',
                    color: 'danger',
                    onClick: () => void handleDelete(driver.id!),
                  },
                ]}
              >
                <List.Item
                  prefix={<span style={{ fontSize: '20px' }}>🚗</span>}
                  description={[driver.phone, driver.vehicleInfo].filter(Boolean).join(' | ')}
                  onClick={() => handleEdit(driver)}
                  clickable
                  arrow
                >
                  {driver.name}
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
        <DriverForm
          driver={editingDriver}
          onClose={() => { setShowForm(false); setEditingDriver(undefined) }}
          onSaved={() => { setShowForm(false); setEditingDriver(undefined); void loadDrivers() }}
        />
      )}
    </div>
  )
}
