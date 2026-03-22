import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { SpinLoading, ErrorBlock } from 'antd-mobile'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAMap } from '@/hooks/useAMap'
import MapView from './MapView'
import type { MapViewHandle } from './MapView'

interface MapContainerProps {
  style?: CSSProperties
  onMapReady?: (map: unknown) => void
}

const MapContainer = forwardRef<MapViewHandle, MapContainerProps>(
  function MapContainer({ style, onMapReady }, ref) {
    const { settings } = useSettingsStore()
    const { status, AMap, error } = useAMap(settings.amapKey)

    if (!settings.amapKey) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            background: '#f5f5f5',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: '#999',
            fontSize: '14px',
          }}
        >
          请先在设置中配置高德地图 API Key
        </div>
      )
    }

    if (status === 'loading') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
          }}
        >
          <SpinLoading />
          <span style={{ marginLeft: '8px', color: '#999' }}>
            地图加载中...
          </span>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <ErrorBlock
          status="default"
          title="地图加载失败"
          description={error ?? '请检查 API Key 是否正确'}
        />
      )
    }

    if (status !== 'loaded' || !AMap) {
      return null
    }

    return (
      <MapView ref={ref} AMap={AMap} style={style} onMapReady={onMapReady} />
    )
  },
)

export default MapContainer
