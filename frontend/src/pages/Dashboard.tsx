import { useEffect, useState } from 'react'
import AlertFeed from '@/components/AlertFeed'
import LayerControls from '@/components/LayerControls'
import MapDisplay from '@/components/MapDisplay'
import VesselPanel from '@/components/VesselPanel'
import type { LayerKey, LayerVisibility } from '@/components/LayerControls'
import type { Alert } from '@/types/maritime'
import { fetchStatus, type SystemStatus } from '@/services/api'

export default function Dashboard() {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    ais: true,
    radar: true,
    fused: true,
    alerts: true,
  })
  const [selectedVessel, setSelectedVessel] = useState<number | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>
    
    const updateStatus = async () => {
      try {
        const status = await fetchStatus()
        setSystemStatus(status)
      } catch (err) {
        console.warn('Failed to fetch system status', err)
      }
    }

    // Initial check
    updateStatus()
    
    // Poll every 10 seconds
    intervalId = setInterval(updateStatus, 10_000)

    return () => clearInterval(intervalId)
  }, [])

  const handleLayerToggle = (layer: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  const handleVesselSelect = (mmsi: number) => {
    setSelectedVessel(mmsi)
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

  const getStatusDisplay = () => {
    if (!systemStatus) return { label: 'Connecting...', color: 'text-slate-400' }
    
    if (systemStatus.aisStream === 'ONLINE') {
        return { label: 'Live', color: 'text-emerald-300' }
    }
    
    if (systemStatus.aisStream === 'OFFLINE') {
        return { label: 'No Data Feed', color: 'text-rose-400' }
    }
    
    return { label: 'Degraded', color: 'text-amber-300' }
  }

  const statusInfo = getStatusDisplay()

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Operations Center</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Maritime Situational Awareness</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
          Status: <span className={statusInfo.color}>{statusInfo.label}</span>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <LayerControls layerVisibility={layerVisibility} onToggle={handleLayerToggle} />
          <div className="h-[55vh] min-h-[360px]">
            <MapDisplay
              layerVisibility={layerVisibility}
              onVesselClick={handleVesselSelect}
              selectedVessel={selectedVessel}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">AIS / Radar Health</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Tracked vessels</span>
                  <span className="text-slate-100">248</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fusion latency</span>
                  <span className="text-emerald-300">1.8s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Integrity alerts</span>
                  <span className="text-rose-300">2 active</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Sensor Coverage</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Coastal radar</span>
                  <span className="text-emerald-300">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Satellite AIS</span>
                  <span className={
                    systemStatus?.aisStream === 'ONLINE' ? 'text-emerald-300' : 'text-rose-400'
                  }>
                    {systemStatus?.aisStream === 'ONLINE' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>HF direction finder</span>
                  <span className="text-amber-300">Degraded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
          <VesselPanel selectedVessel={selectedVessel} onSelect={handleVesselSelect} />
          <AlertFeed alerts={alerts} onAcknowledge={handleAcknowledge} />
        </div>
      </main>
    </div>
  )
}
