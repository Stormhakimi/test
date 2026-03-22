export interface AppSettings {
  /** Gaode Maps JS API Key (Web端) */
  amapKey: string
  /** Human-readable depot address */
  depotAddress: string
  /** GCJ-02 depot coordinates [longitude, latitude] */
  depotCoordinates: [number, number] | null
  /** Whether routes are round-trip by default */
  defaultRoundTrip: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  amapKey: '',
  depotAddress: '',
  depotCoordinates: null,
  defaultRoundTrip: true,
}
