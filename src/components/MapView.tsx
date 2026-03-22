import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { CSSProperties } from 'react'

export interface MapViewHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMap: () => any | null
}

interface MapViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AMap: any
  center?: [number, number] // [longitude, latitude] in GCJ-02
  zoom?: number
  style?: CSSProperties
  className?: string
  onMapReady?: (map: unknown) => void
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { AMap, center = [84.8, 45.5], zoom = 12, style, className, onMapReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }))

  useEffect(() => {
    if (!AMap || !containerRef.current) return
    if (mapRef.current) return // already initialized

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const map = new AMap.Map(containerRef.current, {
      zoom,
      center,
      mapStyle: 'amap://styles/normal',
    })
    mapRef.current = map
    onMapReady?.(map)

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // Only re-init when AMap SDK instance changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AMap])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '300px', ...style }}
      className={className}
    />
  )
})

export default MapView
