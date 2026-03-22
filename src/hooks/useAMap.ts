import { useState, useEffect, useRef } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

export type AMapStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface UseAMapResult {
  status: AMapStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AMap: any
  error: string | null
}

// Module-level singleton — only load once per page session
let cachedAMap: unknown = null
let loadingPromise: Promise<unknown> | null = null

export function useAMap(apiKey: string): UseAMapResult {
  const [status, setStatus] = useState<AMapStatus>(
    cachedAMap ? 'loaded' : 'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!apiKey.trim()) {
      setStatus('idle')
      return
    }
    if (cachedAMap) {
      setStatus('loaded')
      return
    }

    setStatus('loading')

    if (!loadingPromise) {
      loadingPromise = AMapLoader.load({
        key: apiKey,
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.Driving'],
      })
    }

    loadingPromise
      .then((AMap: unknown) => {
        cachedAMap = AMap
        loadingPromise = null
        if (mountedRef.current) setStatus('loaded')
      })
      .catch((err: unknown) => {
        loadingPromise = null // allow retry
        if (mountedRef.current) {
          setStatus('error')
          setError(err instanceof Error ? err.message : '地图加载失败')
        }
      })
  }, [apiKey])

  return { status, AMap: cachedAMap, error }
}
