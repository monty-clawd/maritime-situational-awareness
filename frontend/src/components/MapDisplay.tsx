import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { fetchVessels, getApiBaseUrl } from '@/services/api'
import { MaritimeWebSocket } from '@/services/websocket'
import type { Vessel } from '@/types/maritime'

type LayerVisibility = {
  ais: boolean
  radar: boolean
  fused: boolean
  alerts: boolean
}

type MapDisplayProps = {
  layerVisibility: LayerVisibility
  onVesselClick?: (mmsi: number) => void
  selectedVessel?: number | null
}

const PRUNE_INTERVAL_MS = 60_000 // Prune every minute
const MAX_AGE_MS = 10 * 60 * 1000 // Remove vessels unseen for 10 mins
const UPDATE_THROTTLE_MS = 1000 // Update map at most once per second

export default function MapDisplay({ layerVisibility, onVesselClick, selectedVessel }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onVesselClickRef = useRef<MapDisplayProps['onVesselClick']>(undefined)
  
  // React state for UI sync (active targets list, etc)
  const [vesselsByMmsi, setVesselsByMmsi] = useState<Record<number, Vessel>>({})
  
  // Refs for high-frequency data handling to avoid re-render storms
  const pendingUpdates = useRef<Record<number, Vessel>>({})
  const lastPrune = useRef<number>(Date.now())

  const vessels = useMemo(() => Object.values(vesselsByMmsi), [vesselsByMmsi])
  
  const vesselGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: vessels
        .filter((vessel) => vessel.lastPosition)
        .map((vessel) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              vessel.lastPosition?.longitude ?? 0,
              vessel.lastPosition?.latitude ?? 0,
            ],
          },
          properties: {
            mmsi: vessel.mmsi,
            heading: vessel.lastPosition?.heading ?? 0,
            name: vessel.name ?? '',
          },
        })),
    }),
    [vessels]
  )

  useEffect(() => {
    onVesselClickRef.current = onVesselClick
  }, [onVesselClick])

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return

    const drawVesselArrow = (color: string) => {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) return null

      context.fillStyle = color
      context.strokeStyle = '#0f172a'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(size / 2, 6)
      context.lineTo(size - 10, size - 10)
      context.lineTo(size / 2, size - 18)
      context.lineTo(10, size - 10)
      context.closePath()
      context.fill()
      context.stroke()

      return context.getImageData(0, 0, size, size)
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'Maritime Dark',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-saturation': -0.5,
              'raster-brightness-min': 0.1,
              'raster-brightness-max': 0.5,
            },
          },
        ],
      },
      center: [2.5, 54], // Centered on North Sea
      zoom: 5,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    map.on('load', () => {
      if (!map.hasImage('vessel-arrow')) {
        const imageData = drawVesselArrow('#38bdf8')
        if (!imageData) return
        map.addImage('vessel-arrow', imageData, { pixelRatio: 2 })
      }

      if (!map.hasImage('vessel-arrow-selected')) {
        const imageData = drawVesselArrow('#34d399')
        if (!imageData) return
        map.addImage('vessel-arrow-selected', imageData, { pixelRatio: 2 })
      }

      if (!map.getSource('vessels')) {
        map.addSource('vessels', {
          type: 'geojson',
          data: vesselGeoJson,
        })
      }

      if (!map.getLayer('vessel-icons')) {
        map.addLayer({
          id: 'vessel-icons',
          type: 'symbol',
          source: 'vessels',
          layout: {
            'icon-image': 'vessel-arrow',
            'icon-size': 0.4,
            'icon-allow-overlap': true,
            'icon-rotate': ['coalesce', ['get', 'heading'], 0],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            visibility: layerVisibility.ais ? 'visible' : 'none',
          },
        })
      }

      if (!map.getLayer('vessel-selected')) {
        map.addLayer({
          id: 'vessel-selected',
          type: 'symbol',
          source: 'vessels',
          layout: {
            'icon-image': 'vessel-arrow-selected',
            'icon-size': 0.55,
            'icon-allow-overlap': true,
            'icon-rotate': ['coalesce', ['get', 'heading'], 0],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            visibility: layerVisibility.ais ? 'visible' : 'none',
          },
          filter: ['==', ['get', 'mmsi'], selectedVessel ?? -1],
        })
      }

      map.on('click', 'vessel-icons', (event) => {
        const feature = event.features?.[0]
        const mmsi = feature?.properties?.mmsi
        if (mmsi === undefined || mmsi === null) return
        onVesselClickRef.current?.(Number(mmsi))
      })

      map.on('mouseenter', 'vessel-icons', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'vessel-icons', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // WebSocket Data Handling (Batched)
  useEffect(() => {
    const apiUrl = getApiBaseUrl()
    const envWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim()
    const wsUrl = envWsUrl || `${apiUrl.replace(/\/$/, '').replace(/^http/i, 'ws')}/api/ws`

    const client = new MaritimeWebSocket(wsUrl, {
      onVesselUpdate: (vessel) => {
        // Buffer updates instead of setting state immediately
        pendingUpdates.current[vessel.mmsi] = vessel
      },
    })

    client.connect()

    // Flush loop
    const intervalId = setInterval(() => {
      const updates = pendingUpdates.current
      const hasUpdates = Object.keys(updates).length > 0
      const now = Date.now()
      const shouldPrune = now - lastPrune.current > PRUNE_INTERVAL_MS

      if (hasUpdates || shouldPrune) {
        setVesselsByMmsi((prev) => {
          const next = { ...prev, ...updates }
          
          // Reset buffer
          pendingUpdates.current = {}

          if (shouldPrune) {
            lastPrune.current = now
            const cutoff = new Date(now - MAX_AGE_MS).toISOString()
            const pruned: Record<number, Vessel> = {}
            let prunedCount = 0
            
            for (const [key, v] of Object.entries(next)) {
              if (v.lastPosition && v.lastPosition.timestamp > cutoff) {
                pruned[Number(key)] = v
              } else {
                prunedCount++
              }
            }
            if (prunedCount > 0) {
              console.log(`Pruned ${prunedCount} stale vessels`)
            }
            return pruned
          }
          
          return next
        })
      }
    }, UPDATE_THROTTLE_MS)

    return () => {
      client.disconnect()
      clearInterval(intervalId)
    }
  }, [])

  // Initial Load
  useEffect(() => {
    let isActive = true
    fetchVessels()
      .then((data) => {
        if (!isActive) return
        setVesselsByMmsi((prev) => {
          const next = { ...prev }
          data.forEach((vessel) => {
            next[vessel.mmsi] = vessel
          })
          return next
        })
      })
      .catch((error) => {
        console.warn('Failed to load vessels from API.', error)
      })
    return () => {
      isActive = false
    }
  }, [])

  // Update Map Source (Efficiently)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource('vessels') as GeoJSONSource | undefined
    if (!source) return
    source.setData(vesselGeoJson)
  }, [vesselGeoJson])

  // Update Layer Visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.getLayer('vessel-icons')) return
    map.setLayoutProperty('vessel-icons', 'visibility', layerVisibility.ais ? 'visible' : 'none')
    if (map.getLayer('vessel-selected')) {
      map.setLayoutProperty('vessel-selected', 'visibility', layerVisibility.ais ? 'visible' : 'none')
    }
  }, [layerVisibility.ais])

  // Update Selection Filter
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.getLayer('vessel-selected')) return
    map.setFilter('vessel-selected', ['==', ['get', 'mmsi'], selectedVessel ?? -1])
  }, [selectedVessel])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
      <div ref={mapContainer} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
      <div className="pointer-events-none absolute left-6 top-6 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
        Live Maritime Layer
      </div>
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">
        {layerVisibility.ais ? 'AIS' : 'AIS Off'} · {layerVisibility.radar ? 'Radar' : 'Radar Off'} ·{' '}
        {layerVisibility.fused ? 'Fused' : 'Fused Off'} · {layerVisibility.alerts ? 'Alerts' : 'Alerts Off'}
      </div>
    </div>
  )
}
