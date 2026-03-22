import { useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAMap } from '@/hooks/useAMap'
import { SpinLoading } from 'antd-mobile'
import type { DriverRoute, Location, Driver } from '@/types'

// Colors for different drivers' routes
const DRIVER_COLORS = [
  '#1677ff', // blue
  '#f5222d', // red
  '#52c41a', // green
  '#fa8c16', // orange
  '#722ed1', // purple
  '#eb2f96', // pink
  '#13c2c2', // cyan
  '#fadb14', // yellow
]

interface RouteMapProps {
  driverRoutes: DriverRoute[]
  /** Location details indexed by ID */
  locationMap: Map<number, Location>
  /** Driver details indexed by ID */
  driverMap: Map<number, Driver>
  /** Depot coordinates [lng, lat] */
  depotCoordinates: [number, number]
  style?: CSSProperties
}

export default function RouteMap({
  driverRoutes,
  locationMap,
  driverMap,
  depotCoordinates,
  style,
}: RouteMapProps) {
  const { settings } = useSettingsStore()
  const { status, AMap } = useAMap(settings.amapKey)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([])

  const clearOverlays = useCallback(() => {
    if (mapRef.current && overlaysRef.current.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      mapRef.current.remove(overlaysRef.current)
      overlaysRef.current = []
    }
  }, [])

  const renderRoutes = useCallback(() => {
    if (!AMap || !mapRef.current) return
    clearOverlays()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newOverlays: any[] = []
    const allPoints: [number, number][] = [depotCoordinates]

    // Depot marker
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const depotMarker = new AMap.Marker({
      position: depotCoordinates,
      title: '出发地',
      label: {
        content:
          '<div style="background:#1677ff;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">出发地</div>',
        direction: 'top',
      },
    })
    newOverlays.push(depotMarker)

    driverRoutes.forEach((route, driverIdx) => {
      const color = DRIVER_COLORS[driverIdx % DRIVER_COLORS.length]
      const driver = driverMap.get(route.driverId)
      const driverName = driver?.name ?? `司机${route.driverId}`

      // Build route path: depot → loc1 → loc2 → ...
      const routePath: [number, number][] = [depotCoordinates]

      route.locationIds.forEach((locId, locIdx) => {
        const loc = locationMap.get(locId)
        if (!loc) return

        const coords = loc.coordinates
        routePath.push(coords)
        allPoints.push(coords)

        // Location marker with sequence number
        const seq = locIdx + 1
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const marker = new AMap.Marker({
          position: coords,
          title: loc.name,
          label: {
            content: `<div style="background:${color};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;border:1px solid #fff">${driverName}-${seq}</div>`,
            direction: 'top',
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          icon: new AMap.Icon({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            size: new AMap.Size(24, 24),
            image: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${seq}</text></svg>`)}`,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            imageSize: new AMap.Size(24, 24),
          }),
        })
        newOverlays.push(marker)
      })

      // Draw polyline for this driver's route
      if (routePath.length > 1) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const polyline = new AMap.Polyline({
          path: routePath,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.8,
          lineJoin: 'round',
        })
        newOverlays.push(polyline)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    mapRef.current.add(newOverlays)
    overlaysRef.current = newOverlays

    // Fit bounds to show all markers
    if (allPoints.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      mapRef.current.setFitView(newOverlays, false, [30, 30, 30, 30])
    }
  }, [AMap, driverRoutes, locationMap, driverMap, depotCoordinates, clearOverlays])

  // Init map when AMap loads
  useEffect(() => {
    if (status !== 'loaded' || !AMap || !containerRef.current) return
    if (mapRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    mapRef.current = new AMap.Map(containerRef.current, {
      zoom: 12,
      center: depotCoordinates,
    })

    return () => {
      clearOverlays()
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // Only re-init when AMap SDK instance changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, AMap])

  // Re-render routes when data changes
  useEffect(() => {
    if (status === 'loaded' && mapRef.current) {
      renderRoutes()
    }
  }, [status, renderRoutes, driverRoutes])

  if (!settings.amapKey) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          background: '#f5f5f5',
          color: '#999',
          fontSize: '13px',
          ...style,
        }}
      >
        请先在设置中配置高德地图 API Key
      </div>
    )
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          ...style,
        }}
      >
        <SpinLoading />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '300px', ...style }}
    />
  )
}
