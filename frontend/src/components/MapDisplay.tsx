import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { fetchVessels, fetchLanes, fetchWeather, fetchZones, getApiBaseUrl, type WeatherInfo } from '@/services/api'
import { MaritimeWebSocket } from '@/services/websocket'
import type { Vessel, InterferenceZone, ShippingLane } from '@/types/maritime'

type LayerVisibility = {
  ais: boolean
  radar: boolean
  fused: boolean
  alerts: boolean
  analysis: boolean
  weather: boolean
  zones: boolean
}

type MapDisplayProps = {
  layerVisibility: LayerVisibility
  onVesselClick?: (mmsi: number) => void
  onAlert?: (alert: unknown) => void
  selectedVessel?: number | null
  historyTrack?: GeoJSON.Feature<GeoJSON.LineString> | null
}

const PRUNE_INTERVAL_MS = 60_000 // Prune every minute
const MAX_AGE_MS = 10 * 60 * 1000 // Remove vessels unseen for 10 mins
const UPDATE_THROTTLE_MS = 1000 // Update map at most once per second

export default function MapDisplay({ layerVisibility, onVesselClick, onAlert, selectedVessel, historyTrack }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onVesselClickRef = useRef<MapDisplayProps['onVesselClick']>(undefined)
  const onAlertRef = useRef<MapDisplayProps['onAlert']>(undefined)
  
  // React state for UI sync (active targets list, etc)
  const [vesselsByMmsi, setVesselsByMmsi] = useState<Record<number, Vessel>>({})
  const [interferenceZones, setInterferenceZones] = useState<InterferenceZone[]>([])
  const [lanes, setLanes] = useState<ShippingLane[]>([])
  const [zonesData, setZonesData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [weatherData, setWeatherData] = useState<WeatherInfo | null>(null)
  const [weatherLocation, setWeatherLocation] = useState<[number, number] | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  
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
            isLoitering: vessel.isLoitering ?? false,
          },
        })),
    }),
    [vessels]
  )

  const interferenceGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: interferenceZones.map((zone, i) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [zone.longitude, zone.latitude],
        },
        properties: {
          id: `zone-${i}`,
          severity: zone.severity,
          radius: zone.radiusMeters,
        },
      })),
    }
  }, [interferenceZones])

  const lanesGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: lanes.map((lane) => ({
        type: 'Feature' as const,
        geometry: {
            type: 'Polygon' as const,
            coordinates: [[
                [lane.bounds.minLon, lane.bounds.minLat],
                [lane.bounds.maxLon, lane.bounds.minLat],
                [lane.bounds.maxLon, lane.bounds.maxLat],
                [lane.bounds.minLon, lane.bounds.maxLat],
                [lane.bounds.minLon, lane.bounds.minLat]
            ]]
        },
        properties: {
            name: lane.name,
            direction: lane.direction
        }
    }))
  }), [lanes])

  const weatherGeoJson = useMemo(() => {
    if (!weatherData || !weatherLocation) return { type: 'FeatureCollection' as const, features: [] }
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: weatherLocation
        },
        properties: {
          windSpeed: weatherData.windSpeedKnots,
          windDir: weatherData.windDirection,
          waveHeight: weatherData.waveHeightMeters ?? 0,
          label: `${weatherData.windSpeedKnots} kn`
        }
      }]
    }
  }, [weatherData, weatherLocation])

  useEffect(() => {
    onVesselClickRef.current = onVesselClick
  }, [onVesselClick])

  useEffect(() => {
    onAlertRef.current = onAlert
  }, [onAlert])

  useEffect(() => {
    if (layerVisibility.weather && mapRef.current) {
        // Fetch if enabled and no data, or maybe on drag end? 
        // For MVP just fetch center once when enabled.
        const center = mapRef.current.getCenter()
        fetchWeather(center.lat, center.lng)
            .then(data => {
                setWeatherData(data)
                setWeatherLocation([center.lng, center.lat])
            })
            .catch(err => console.warn('Failed to fetch weather', err))
    }
  }, [layerVisibility.weather])

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
      center: [-123.0, 48.3], // Centered on Salish Sea (near mock data)
      zoom: 8,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    map.on('load', () => {
      setIsMapLoaded(true)

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

      // Lanes Source & Layers
      if (!map.getSource('lanes')) {
        map.addSource('lanes', { type: 'geojson', data: lanesGeoJson })
      }
      
      if (!map.getLayer('lanes-fill')) {
        map.addLayer({
            id: 'lanes-fill',
            type: 'fill',
            source: 'lanes',
            paint: {
                'fill-color': '#10b981', // Emerald 500
                'fill-opacity': 0.1
            },
            layout: { visibility: layerVisibility.analysis ? 'visible' : 'none' }
        })
      }
      
       if (!map.getLayer('lanes-line')) {
        map.addLayer({
            id: 'lanes-line',
            type: 'line',
            source: 'lanes',
            paint: {
                'line-color': '#34d399', // Emerald 400
                'line-width': 1,
                'line-dasharray': [2, 2],
                'line-opacity': 0.5
            },
            layout: { visibility: layerVisibility.analysis ? 'visible' : 'none' }
        })
      }

      // Zones Source & Layers
      if (!map.getSource('zones')) {
        map.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }

      if (!map.getLayer('zones-fill')) {
        map.addLayer({
          id: 'zones-fill',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'RESTRICTED', '#ef4444', // Red for restricted
              'WIND_FARM', '#f59e0b', // Amber for wind farms
              '#3b82f6' // Blue default
            ],
            'fill-opacity': 0.2
          },
          layout: { visibility: layerVisibility.zones ? 'visible' : 'none' }
        })
      }

      if (!map.getLayer('zones-line')) {
        map.addLayer({
          id: 'zones-line',
          type: 'line',
          source: 'zones',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'RESTRICTED', '#ef4444',
              'WIND_FARM', '#f59e0b',
              '#3b82f6'
            ],
            'line-width': 2,
            'line-dasharray': [2, 1]
          },
          layout: { visibility: layerVisibility.zones ? 'visible' : 'none' }
        })
      }

      if (!map.hasImage('wind-arrow')) {
         const imageData = drawVesselArrow('#f9fafb') // Slate 50
         if (imageData) map.addImage('wind-arrow', imageData, { pixelRatio: 2 })
      }

      if (!map.getSource('weather')) {
        map.addSource('weather', { type: 'geojson', data: weatherGeoJson })
      }

      if (!map.getSource('history-track')) {
        map.addSource('history-track', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }

      if (!map.getLayer('history-track-line')) {
        map.addLayer({
            id: 'history-track-line',
            type: 'line',
            source: 'history-track',
            paint: {
                'line-color': '#fcd34d', // Amber 300
                'line-width': 2,
                'line-opacity': 0.8
            }
        })
      }

      if (!map.getLayer('weather-icon')) {
        map.addLayer({
            id: 'weather-icon',
            type: 'symbol',
            source: 'weather',
            layout: {
                'icon-image': 'wind-arrow',
                'icon-size': 0.5,
                'icon-rotate': ['get', 'windDir'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'text-field': ['get', 'label'],
                'text-font': ['Open Sans Bold'],
                'text-size': 12,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                visibility: layerVisibility.weather ? 'visible' : 'none'
            },
            paint: {
                'text-color': '#f9fafb',
                'text-halo-color': '#0f172a',
                'text-halo-width': 2
            }
        })
      }

      if (!map.getSource('vessels')) {
        map.addSource('vessels', {
          type: 'geojson',
          data: vesselGeoJson,
        })
      }

      if (!map.getLayer('loitering-halo')) {
        map.addLayer({
          id: 'loitering-halo',
          type: 'circle',
          source: 'vessels',
          paint: {
            'circle-radius': 30,
            'circle-color': '#facc15',
            'circle-opacity': 0.4,
            'circle-blur': 0.4,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fde047',
            'circle-stroke-opacity': 0.6,
          },
          filter: ['==', ['get', 'isLoitering'], true],
          layout: {
            visibility: layerVisibility.analysis ? 'visible' : 'none',
          },
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

      if (!map.getSource('interference')) {
        map.addSource('interference', {
          type: 'geojson',
          data: interferenceGeoJson,
        })
      }

      if (!map.getLayer('interference-zones')) {
        map.addLayer({
          id: 'interference-zones',
          type: 'circle',
          source: 'interference',
          paint: {
            'circle-radius': 40,
            'circle-color': '#ef4444',
            'circle-opacity': 0.3,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#f87171',
          },
          layout: {
            visibility: layerVisibility.alerts ? 'visible' : 'none',
          }
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
      onAlert: (payload: any) => {
        if (payload?.type === 'INTERFERENCE_ZONE') {
          setInterferenceZones(payload.zones || [])
        } else {
          onAlertRef.current?.(payload)
        }
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
      
    fetchLanes()
      .then((data) => {
          if (!isActive) return
          setLanes(data)
      })
      .catch(console.warn)

    fetchZones()
      .then((data) => {
        if (!isActive) return
        setZonesData(data)
      })
      .catch(console.warn)

    return () => {
      isActive = false
    }
  }, [])

  // Update Map Source (Efficiently)
  useEffect(() => {
    if (!isMapLoaded) return
    const map = mapRef.current
    if (!map) return

    const source = map.getSource('vessels') as GeoJSONSource | undefined
    if (source) source.setData(vesselGeoJson)

    const interferenceSource = map.getSource('interference') as GeoJSONSource | undefined
    if (interferenceSource) interferenceSource.setData(interferenceGeoJson)
    
    const lanesSource = map.getSource('lanes') as GeoJSONSource | undefined
    if (lanesSource) lanesSource.setData(lanesGeoJson)
    
    const zonesSource = map.getSource('zones') as GeoJSONSource | undefined
    if (zonesSource && zonesData) zonesSource.setData(zonesData)

    const weatherSource = map.getSource('weather') as GeoJSONSource | undefined
    if (weatherSource) weatherSource.setData(weatherGeoJson)
    
    const historySource = map.getSource('history-track') as GeoJSONSource | undefined
    if (historySource) {
        historySource.setData({
            type: 'FeatureCollection',
            features: historyTrack ? [historyTrack] : []
        })
    }
  }, [isMapLoaded, vesselGeoJson, interferenceGeoJson, lanesGeoJson, weatherGeoJson, historyTrack, zonesData])

  // Update Layer Visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('vessel-icons')) {
      map.setLayoutProperty('vessel-icons', 'visibility', layerVisibility.ais ? 'visible' : 'none')
    }
    if (map.getLayer('vessel-selected')) {
      map.setLayoutProperty('vessel-selected', 'visibility', layerVisibility.ais ? 'visible' : 'none')
    }
    if (map.getLayer('interference-zones')) {
      map.setLayoutProperty('interference-zones', 'visibility', layerVisibility.alerts ? 'visible' : 'none')
    }
    if (map.getLayer('loitering-halo')) {
      map.setLayoutProperty('loitering-halo', 'visibility', layerVisibility.analysis ? 'visible' : 'none')
    }
    if (map.getLayer('lanes-fill')) {
      map.setLayoutProperty('lanes-fill', 'visibility', layerVisibility.analysis ? 'visible' : 'none')
    }
    if (map.getLayer('lanes-line')) {
      map.setLayoutProperty('lanes-line', 'visibility', layerVisibility.analysis ? 'visible' : 'none')
    }
    if (map.getLayer('zones-fill')) {
      map.setLayoutProperty('zones-fill', 'visibility', layerVisibility.zones ? 'visible' : 'none')
    }
    if (map.getLayer('zones-line')) {
      map.setLayoutProperty('zones-line', 'visibility', layerVisibility.zones ? 'visible' : 'none')
    }
    if (map.getLayer('weather-icon')) {
      map.setLayoutProperty('weather-icon', 'visibility', layerVisibility.weather ? 'visible' : 'none')
    }
  }, [layerVisibility])

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
        {layerVisibility.fused ? 'Fused' : 'Fused Off'} · {layerVisibility.alerts ? 'Alerts' : 'Alerts Off'} ·{' '}
        {layerVisibility.analysis ? 'Analysis' : 'Analysis Off'} · {layerVisibility.zones ? 'Zones' : 'Zones Off'}
      </div>
    </div>
  )
}
