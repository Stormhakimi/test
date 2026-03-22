import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  List,
  Card,
  Button,
  Empty,
  SpinLoading,
  Tag,
  Toast,
} from 'antd-mobile'
import { dispatchDb, locationDb, driverDb } from '@/lib/db'
import type { Dispatch, Location, Driver } from '@/types'
import { generateWeChatText } from '@/lib/wechat-text'
import type { GenerateTextInput, EnrichedDriverRoute } from '@/lib/wechat-text'

// ─── History List View ─────────────────────────────────────────────────────────

function HistoryListView() {
  const navigate = useNavigate()
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await dispatchDb.getAll()
      setDispatches(data)
      setLoading(false)
    })()
  }, [])

  const totalDrivers = (d: Dispatch) => d.driverRoutes.length
  const totalLocations = (d: Dispatch) =>
    d.driverRoutes.reduce((sum, r) => sum + r.locationIds.length, 0)
  const totalDistance = (d: Dispatch) =>
    d.driverRoutes.reduce((sum, r) => sum + r.totalDistance, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar back={null} style={{ borderBottom: '1px solid #f0f0f0' }}>
        调度历史
      </NavBar>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <SpinLoading />
          </div>
        ) : dispatches.length === 0 ? (
          <Empty description="还没有调度记录" />
        ) : (
          <List style={{ marginTop: '8px' }}>
            {dispatches.map(d => (
              <List.Item
                key={d.id}
                clickable
                arrow
                onClick={() => navigate(`/history/${d.id}`)}
                description={
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {totalDrivers(d)} 名司机 · {totalLocations(d)} 个站点 · {(totalDistance(d) / 1000).toFixed(1)} 公里
                  </span>
                }
                extra={
                  <Tag color={d.status === 'completed' ? 'success' : 'default'}>
                    {d.status === 'completed' ? '已完成' : '计划中'}
                  </Tag>
                }
              >
                {d.date}
              </List.Item>
            ))}
          </List>
        )}
      </div>
    </div>
  )
}

// ─── History Detail View ───────────────────────────────────────────────────────

function HistoryDetailView({ id }: { id: string }) {
  const navigate = useNavigate()
  const [dispatch, setDispatch] = useState<Dispatch | null>(null)
  const [locations, setLocations] = useState<Map<number, Location>>(new Map())
  const [drivers, setDrivers] = useState<Map<number, Driver>>(new Map())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const d = await dispatchDb.getById(Number(id))
    if (!d) { setLoading(false); return }
    setDispatch(d)

    // Load location data
    const allLocs = await locationDb.getAll()
    setLocations(new Map(allLocs.map(l => [l.id!, l])))

    // Load driver data
    const allDrivers = await driverDb.getAll()
    setDrivers(new Map(allDrivers.map(dr => [dr.id!, dr])))
    setLoading(false)
  }, [id])

  useEffect(() => { void loadData() }, [loadData])

  const handleCopyText = () => {
    if (!dispatch) return
    const input: GenerateTextInput = {
      date: dispatch.date,
      routes: dispatch.driverRoutes.map(r => {
        const driver = drivers.get(r.driverId)
        const orderedLocations = r.locationIds
          .map(lid => {
            const loc = locations.get(lid)
            if (!loc) return null
            return {
              id: loc.id!,
              name: loc.name,
              type: loc.type,
              address: loc.address,
              notes: loc.notes,
            }
          })
          .filter(Boolean) as EnrichedDriverRoute['orderedLocations']
        
        const enriched: EnrichedDriverRoute = {
          driver: {
            id: driver?.id ?? r.driverId,
            name: driver?.name ?? `司机${r.driverId}`,
            vehicleInfo: driver?.vehicleInfo ?? '',
          },
          orderedLocations,
          totalDistance: r.totalDistance,
          totalTime: r.totalTime,
          constraints: dispatch.constraints,
        }
        return enriched
      }),
    }

    const text = generateWeChatText(input)
    void navigator.clipboard.writeText(text).then(() => {
      Toast.show({ icon: 'success', content: '已复制到剪贴板' })
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <SpinLoading />
      </div>
    )
  }

  if (!dispatch) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <NavBar onBack={() => navigate('/history')}>调度详情</NavBar>
        <Empty description="未找到该调度记录" />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate('/history')}
        right={
          <Button size="mini" color="primary" onClick={handleCopyText}>
            复制通知
          </Button>
        }
      >
        {dispatch.date} 调度
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', padding: '12px' }}>
        {dispatch.driverRoutes.map((route, idx) => {
          const driver = drivers.get(route.driverId)
          return (
            <Card
              key={idx}
              title={`🚗 ${driver?.name ?? `司机${route.driverId}`}`}
              extra={<span style={{ fontSize: '12px', color: '#999' }}>{(route.totalDistance / 1000).toFixed(1)} 公里</span>}
              style={{ marginBottom: '12px' }}
            >
              <List>
                {route.locationIds.map((lid, locIdx) => {
                  const loc = locations.get(lid)
                  return (
                    <List.Item
                      key={lid}
                      prefix={<span style={{ fontSize: '14px', minWidth: '20px' }}>{locIdx + 1}.</span>}
                      description={loc?.address || undefined}
                    >
                      {loc?.name ?? `地点${lid}`}
                    </List.Item>
                  )
                })}
              </List>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>()
  return id ? <HistoryDetailView id={id} /> : <HistoryListView />
}
