import type { Vessel } from '@/types/maritime'
import { formatKnots, formatLatLon } from '@/utils/format'

const demoVessels: Vessel[] = [
  {
    mmsi: 366982330,
    imo: 9241061,
    name: 'Pacific Sentinel',
    flag: 'US',
    type: 'Container',
    destination: 'Los Angeles',
    lastPosition: {
      timestamp: new Date().toISOString(),
      latitude: 34.245,
      longitude: -120.121,
      speed: 18.2,
      heading: 246,
      source: 'FUSED',
      confidence: 0.93,
    },
  },
  {
    mmsi: 477123900,
    name: 'Aegean Crest',
    flag: 'HK',
    type: 'Tanker',
    destination: 'Long Beach',
    lastPosition: {
      timestamp: new Date().toISOString(),
      latitude: 33.112,
      longitude: -118.92,
      speed: 11.4,
      heading: 190,
      source: 'AIS',
      confidence: 0.88,
    },
  },
]

export default function VesselPanel() {
  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Vessels</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">Active Targets</h2>
      </div>
      <div className="space-y-4 overflow-auto pr-2">
        {demoVessels.map((vessel) => (
          <article
            key={vessel.mmsi}
            className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-50">{vessel.name || 'Unknown'}</p>
                <p className="text-xs text-slate-400">MMSI {vessel.mmsi}</p>
              </div>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                {vessel.type ?? 'Unknown'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>
                <p className="text-slate-500">Position</p>
                <p>{vessel.lastPosition ? formatLatLon(vessel.lastPosition.latitude, vessel.lastPosition.longitude) : '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Speed</p>
                <p>{formatKnots(vessel.lastPosition?.speed)}</p>
              </div>
              <div>
                <p className="text-slate-500">Destination</p>
                <p>{vessel.destination ?? '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Source</p>
                <p>{vessel.lastPosition?.source ?? '--'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Confidence</span>
              <span>{((vessel.lastPosition?.confidence ?? 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300"
                style={{ width: `${(vessel.lastPosition?.confidence ?? 0) * 100}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
