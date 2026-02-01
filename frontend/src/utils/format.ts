export const formatLatLon = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`
}

export const formatKnots = (speed?: number): string => {
  if (speed === undefined || Number.isNaN(speed)) return '--'
  return `${speed.toFixed(1)} kn`
}
