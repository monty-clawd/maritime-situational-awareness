import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

type LayerVisibility = {
  ais: boolean
  radar: boolean
  fused: boolean
  alerts: boolean
}

type MapDisplayProps = {
  layerVisibility: LayerVisibility
}

export default function MapDisplay({ layerVisibility }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [-20, 20],
      zoom: 2.2,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    return () => {
      map.remove()
    }
  }, [])

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
