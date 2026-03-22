// GCJ-02 coordinate system (Gaode/Amap uses GCJ-02, NOT WGS-84)
// Coordinates stored as [longitude, latitude]

export type LocationType = 'oil_well' | 'warehouse' | 'gas_station' | 'other'

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  oil_well: '油井',
  warehouse: '仓库',
  gas_station: '加油站',
  other: '其他',
}

export interface Location {
  id?: number
  name: string
  type: LocationType
  address: string
  /** GCJ-02 coordinates: [longitude, latitude] */
  coordinates: [number, number]
  notes: string
  createdAt: number
  updatedAt: number
}
