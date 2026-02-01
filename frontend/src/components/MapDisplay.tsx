import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
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
}

export default function MapDisplay({ layerVisibility, onVesselClick }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onVesselClickRef = useRef<MapDisplayProps['onVesselClick']>(undefined)
  const [vesselsByMmsi, setVesselsByMmsi] = useState<Record<number, Vessel>>({})

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

  useEffect(() => {
    if (!mapContainer.current) return

    // Maritime-focused map style with OpenStreetMap base
    // Using a darker style better suited for maritime ops center
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
      center: [10, 54], // North Sea / Baltic - common maritime area
      zoom: 4,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    map.on('load', () => {
      if (!map.hasImage('vessel-arrow')) {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) return

        context.fillStyle = '#38bdf8'
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

        const imageData = context.getImageData(0, 0, size, size)
        map.addImage('vessel-arrow', imageData, { pixelRatio: 2 })
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

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000'
    const wsUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      `${apiUrl.replace(/\/$/, '').replace(/^http/i, 'ws')}/api/ws`

    const client = new MaritimeWebSocket(wsUrl, {
      onVesselUpdate: (vessel) => {
        setVesselsByMmsi((prev) => ({ ...prev, [vessel.mmsi]: vessel }))
      },
    })

    client.connect()

    return () => {
      client.disconnect()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource('vessels') as GeoJSONSource | undefined
    if (!source) return
    source.setData(vesselGeoJson)
  }, [vesselGeoJson])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.getLayer('vessel-icons')) return
    map.setLayoutProperty('vessel-icons', 'visibility', layerVisibility.ais ? 'visible' : 'none')
  }, [layerVisibility.ais])

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
