import { useState } from 'react'
import AlertFeed from '@/components/AlertFeed'
import LayerControls from '@/components/LayerControls'
import MapDisplay from '@/components/MapDisplay'
import VesselPanel from '@/components/VesselPanel'
import SystemStatusWidget from '@/components/SystemStatusWidget'
import TimelinePanel from '@/components/TimelinePanel'
import type { LayerKey, LayerVisibility } from '@/components/LayerControls'
import type { Alert } from '@/types/maritime'

export default function Dashboard() {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    ais: true,
    radar: true,
    fused: true,
    alerts: true,
    analysis: false,
    weather: false,
  })
  const [selectedVessel, setSelectedVessel] = useState<number | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showTimeline, setShowTimeline] = useState(false)
  const [historyTrack, setHistoryTrack] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null)

  const handleLayerToggle = (layer: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  const handleVesselSelect = (mmsi: number) => {
    setSelectedVessel(mmsi)
    // If selecting a different vessel, clear timeline unless we want to keep it open?
    // Let's keep it open if it's the same vessel, otherwise close it or reload.
    // For simplicity, let's close it if we switch vessels so the user has to click "History" again.
    if (mmsi !== selectedVessel) {
        setShowTimeline(false)
        setHistoryTrack(null)
    }
  }

  const handleAcknowledge = (id: number) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedAt: alert.acknowledgedAt ?? new Date().toISOString(),
            }
          : alert,
      ),
    )
  }

  const handleAlert = (payload: any) => {
    // Map backend integrity alert to frontend Alert type
    const newAlert: Alert = {
      id: Date.now(), // Generate temp ID
      mmsi: Number(payload.mmsi),
      type: payload.type,
      severity: payload.severity || 'MEDIUM',
      createdAt: payload.timestamp || new Date().toISOString(),
      acknowledged: false,
      details: payload.details
    }
    setAlerts(prev => [newAlert, ...prev].slice(0, 50)) // Keep last 50
  }

  const activeVesselAlerts = alerts.filter(a => a.mmsi === selectedVessel && !a.acknowledged)

  return (
    <div className="flex h-full flex-col gap-6 p-8 relative">
      <div className="absolute top-8 right-8 z-10">
        <SystemStatusWidget />
      </div>
      <header className="flex flex-wrap items-center justify-between gap-4 pr-80">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Operations Center</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Maritime Situational Awareness</h1>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <LayerControls layerVisibility={layerVisibility} onToggle={handleLayerToggle} />
          <div className="h-[55vh] min-h-[360px]">
            <MapDisplay
              layerVisibility={layerVisibility}
              onVesselClick={handleVesselSelect}
              onAlert={handleAlert}
              selectedVessel={selectedVessel}
            />
          </div>
        </div>
        <div className="grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
          <VesselPanel 
            selectedVessel={selectedVessel} 
            onSelect={handleVesselSelect} 
            activeAlerts={activeVesselAlerts}
          />
          <AlertFeed alerts={alerts} onAcknowledge={handleAcknowledge} />
        </div>
      </main>
    </div>
  )
}

