import type { Alert } from '@/types/maritime'

const demoAlerts: Alert[] = [
  {
    id: 101,
    mmsi: 366982330,
    type: 'POSITION_DISCREPANCY',
    severity: 'HIGH',
    createdAt: new Date().toISOString(),
    details: { deltaMeters: 812, source: 'Radar vs AIS' },
  },
  {
    id: 102,
    mmsi: 477123900,
    type: 'SIGNAL_GAP',
    severity: 'MEDIUM',
    createdAt: new Date().toISOString(),
    details: { gapSeconds: 42 },
  },
]

const severityStyles: Record<Alert['severity'], string> = {
  LOW: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  MEDIUM: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  HIGH: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
}

export default function AlertFeed() {
  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-rose-200/80">Integrity Alerts</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">Active Advisories</h2>
      </div>
      <div className="space-y-3 overflow-auto pr-2">
        {demoAlerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${severityStyles[alert.severity]}`}>
                {alert.severity}
              </span>
              <span className="text-xs text-slate-500">MMSI {alert.mmsi}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">{alert.type.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-xs text-slate-400">
              {alert.details ? JSON.stringify(alert.details) : 'No details provided'}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">{new Date(alert.createdAt).toLocaleTimeString()}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
