import type { Alert } from '@/types/maritime'

const severityStyles: Record<Alert['severity'], string> = {
  LOW: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  MEDIUM: 'border-yellow-400/40 bg-yellow-500/10 text-yellow-200',
  HIGH: 'border-red-400/40 bg-red-500/10 text-red-200',
}

type AlertFeedProps = {
  alerts: Alert[]
  onAcknowledge: (id: number) => void
}

export default function AlertFeed({ alerts, onAcknowledge }: AlertFeedProps) {
  const sortedAlerts = [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-rose-200/80">Integrity Alerts</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">Active Advisories</h2>
      </div>
      <div className="space-y-3 overflow-auto pr-2">
        {sortedAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800/70 bg-slate-900/40 p-6 text-sm text-slate-400">
            No alerts to display.
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 ${
                alert.acknowledged ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${severityStyles[alert.severity]}`}
                >
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-500">MMSI {alert.mmsi}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-100">{alert.type.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xs text-slate-400">
                {alert.details ? JSON.stringify(alert.details) : 'No details provided'}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                {alert.acknowledged ? (
                  <span>ACK {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleTimeString() : ''}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(alert.id)}
                    className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Ack
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
