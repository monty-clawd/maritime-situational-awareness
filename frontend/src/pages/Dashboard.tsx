import AlertFeed from '@/components/AlertFeed'
import MapDisplay from '@/components/MapDisplay'
import VesselPanel from '@/components/VesselPanel'

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Operations Center</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Maritime Situational Awareness</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
          Status: <span className="text-emerald-300">Live</span>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="h-[55vh] min-h-[360px]">
            <MapDisplay />
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
                  <span className="text-emerald-300">Online</span>
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
          <VesselPanel />
          <AlertFeed />
        </div>
      </main>
    </div>
  )
}
