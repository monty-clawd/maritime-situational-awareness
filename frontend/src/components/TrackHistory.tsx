import { useEffect } from 'react'

type TrackHistoryPosition = {
  lat: number
  lon: number
  timestamp: string
}

type TrackHistoryProps = {
  selectedVessel: number | null
  positions: TrackHistoryPosition[]
}

export default function TrackHistory({ selectedVessel, positions }: TrackHistoryProps) {
  useEffect(() => {
    if (selectedVessel === null) return
    console.log('TrackHistory selected vessel', { mmsi: selectedVessel, positionsCount: positions.length })
  }, [selectedVessel, positions.length])

  return null
}
