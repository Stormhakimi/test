import { useState, useRef, useCallback } from 'react'
import { Popup, NavBar, SearchBar, Button, Toast, SpinLoading } from 'antd-mobile'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAMap } from '@/hooks/useAMap'
import MapView from './MapView'
import type { MapViewHandle } from './MapView'

interface LocationPickerProps {
  initialCoordinates?: [number, number]
  onConfirm: (coordinates: [number, number], address: string) => void
  onClose: () => void
}

export default function LocationPicker({
  initialCoordinates,
  onConfirm,
  onClose,
}: LocationPickerProps) {
  const { settings } = useSettingsStore()
  const { status, AMap } = useAMap(settings.amapKey)
  const mapRef = useRef<MapViewHandle>(null)

  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(
    initialCoordinates ?? null
  )
  const [selectedAddress, setSelectedAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Reverse geocode a coordinate to get address
  const reverseGeocode = useCallback(
    async (coords: [number, number]) => {
      if (!AMap) return
      setIsGeocoding(true)
      try {
        await new Promise<void>((resolve) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
          const geocoder = new AMap.Geocoder({ radius: 500 })
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          geocoder.getAddress(
            coords,
            (
              geocodeStatus: string,
              result: { regeocode?: { formattedAddress?: string } },
            ) => {
              if (
                geocodeStatus === 'complete' &&
                result.regeocode?.formattedAddress
              ) {
                setSelectedAddress(result.regeocode.formattedAddress)
              } else {
                setSelectedAddress(
                  `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
                )
              }
              resolve()
            },
          )
        })
      } finally {
        setIsGeocoding(false)
      }
    },
    [AMap],
  )

  // Forward geocode an address to get coordinates
  const geocodeAddress = useCallback(async () => {
    if (!AMap || !searchQuery.trim()) return
    setIsGeocoding(true)
    try {
      await new Promise<void>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const geocoder = new AMap.Geocoder()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        geocoder.getLocation(
          searchQuery,
          (
            geocodeStatus: string,
            result: {
              geocodes?: Array<{
                location: { lng: number; lat: number }
                formattedAddress: string
              }>
            },
          ) => {
            if (geocodeStatus === 'complete' && result.geocodes?.[0]) {
              const loc = result.geocodes[0]
              const coords: [number, number] = [
                loc.location.lng,
                loc.location.lat,
              ]
              setSelectedCoords(coords)
              setSelectedAddress(loc.formattedAddress)

              // Move map to the found location
              const map = mapRef.current?.getMap()
              if (map) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                map.setCenter(coords)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                map.setZoom(15)
              }
            } else {
              Toast.show({ icon: 'fail', content: '未找到该地址' })
            }
            resolve()
          },
        )
      })
    } finally {
      setIsGeocoding(false)
    }
  }, [AMap, searchQuery])

  const handleMapReady = useCallback(
    (map: unknown) => {
      const typedMap = map as {
        on: (
          event: string,
          handler: (e: {
            lnglat: { getLng: () => number; getLat: () => number }
          }) => void,
        ) => void
      }
      // Listen for map clicks
      typedMap.on('click', (e) => {
        const coords: [number, number] = [
          e.lnglat.getLng(),
          e.lnglat.getLat(),
        ]
        setSelectedCoords(coords)
        void reverseGeocode(coords)
      })
    },
    [reverseGeocode],
  )

  const handleConfirm = () => {
    if (!selectedCoords) {
      Toast.show({ content: '请先在地图上点击选择位置' })
      return
    }
    onConfirm(selectedCoords, selectedAddress)
  }

  return (
    <Popup
      visible
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: '90vh',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NavBar
        onBack={onClose}
        right={
          <Button
            size="mini"
            color="primary"
            onClick={handleConfirm}
            disabled={!selectedCoords}
          >
            确认
          </Button>
        }
      >
        选择位置
      </NavBar>

      {/* Search bar */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
        <SearchBar
          placeholder="搜索地址"
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ flex: 1 }}
          onSearch={() => void geocodeAddress()}
        />
        <Button
          size="small"
          onClick={() => void geocodeAddress()}
          loading={isGeocoding}
        >
          搜索
        </Button>
      </div>

      {/* Selected address display */}
      {selectedCoords && (
        <div
          style={{
            padding: '8px 12px',
            background: '#f0f8ff',
            fontSize: '13px',
            color: '#333',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          📍{' '}
          {selectedAddress ||
            `${selectedCoords[0].toFixed(5)}, ${selectedCoords[1].toFixed(5)}`}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {status === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              zIndex: 1,
            }}
          >
            <SpinLoading />
            <span style={{ marginLeft: '8px', color: '#999' }}>
              地图加载中...
            </span>
          </div>
        )}
        {status === 'idle' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '14px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            请先在设置中配置高德地图 API Key
          </div>
        )}
        {status === 'loaded' && AMap && (
          <MapView
            ref={mapRef}
            AMap={AMap}
            center={selectedCoords ?? [84.8, 45.5]}
            zoom={12}
            style={{ height: '100%' }}
            onMapReady={handleMapReady}
          />
        )}
      </div>

      <div
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
        }}
      >
        点击地图选择位置，或使用搜索框查找地址
      </div>
    </Popup>
  )
}
