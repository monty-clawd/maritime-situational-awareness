import { useMemo, useState } from 'react'
import ActiveTargetsList from '@/components/ActiveTargetsList'
import { addToWatchlist, removeFromWatchlist } from '@/services/api'
import type { WatchlistEntry, Alert } from '@/types/maritime'
import { formatKnots, formatLatLon } from '@/utils/format'

type VesselPanelProps = {
  selectedVessel: number | null
  onSelect: (mmsi: number) => void
  activeAlerts?: Alert[]
}

export default function VesselPanel({ selectedVessel, onSelect, activeAlerts }: VesselPanelProps) {
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([])
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [actionState, setActionState] = useState<'idle' | 'working'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  const selectedEntry = useMemo(
    () =>
      selectedVessel === null
        ? null
        : watchlistEntries.find((vessel) => vessel.mmsi === selectedVessel) ?? null,
    [selectedVessel, watchlistEntries],
  )

  const isTracked = selectedVessel !== null && watchlistEntries.some((vessel) => vessel.mmsi === selectedVessel)

  const handleTrackToggle = async () => {
    if (selectedVessel === null || actionState === 'working') return
    setActionState('working')
    setActionError(null)
    try {
      if (isTracked) {
        await removeFromWatchlist(selectedVessel)
      } else {
        await addToWatchlist(selectedVessel)
      }
      setRefreshSignal((prev) => prev + 1)
    } catch (err) {
      setActionError('Unable to update watchlist.')
    } finally {
      setActionState('idle')
    }
  }

  const statusBadge = isTracked ? 'Tracked' : 'Untracked'
  const statusStyles = isTracked
    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    : 'border-slate-700/80 bg-slate-900/80 text-slate-300'

  const selectedName = selectedEntry?.name ?? 'Unknown'
  const selectedType = selectedEntry?.type ?? 'Unknown'
  const selectedPosition = selectedEntry?.lastPosition
  const selectedCallSign = selectedEntry?.callSign ?? '--'
  const selectedDestination = selectedEntry?.destination ?? '--'
  const selectedFlag = selectedEntry?.flag ?? '--'
  const selectedLength = selectedEntry?.length ? `${selectedEntry.length} m` : '--'
  const selectedWidth = selectedEntry?.width ? `${selectedEntry.width} m` : '--'
  const selectedImo = selectedEntry?.imo ? String(selectedEntry.imo) : '--'
  const selectedAddedAt = selectedEntry?.addedAt
    ? new Date(selectedEntry.addedAt).toLocaleString()
    : '--'

  const integrityAlert = activeAlerts?.find((a) =>
    ['SPEED_ANOMALY', 'TELEPORT_ANOMALY', 'POSITION_MISMATCH'].includes(a.type),
  )

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Vessels</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">Active Targets</h2>
      </div>
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
        {selectedVessel === null ? (
          <p className="text-sm text-slate-400">Select a vessel on the map.</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-50">{selectedName}</p>
                <p className="text-xs text-slate-400">MMSI {selectedVessel}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  {statusBadge}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${statusStyles}`}>
                  {statusBadge}
                </span>
                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                  {selectedType}
                </span>
                {integrityAlert && (
                  <span className="animate-pulse rounded-full border border-amber-400/60 bg-amber-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">
                    Integrity: {integrityAlert.type.split('_')[0]}
                  </span>
                )}
              </div>
            </div>
            {integrityAlert && (
              <div className="mt-3 rounded border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                <span className="font-semibold text-amber-100">Warning:</span> {String(integrityAlert.details)}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <p className="text-slate-500">Position</p>
                <p>{selectedPosition ? formatLatLon(selectedPosition.latitude, selectedPosition.longitude) : '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Speed</p>
                <p>{formatKnots(selectedPosition?.speed)}</p>
              </div>
              <div>
                <p className="text-slate-500">Destination</p>
                <p>{selectedDestination}</p>
              </div>
              <div>
                <p className="text-slate-500">Source</p>
                <p>{selectedPosition?.source ?? '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Call sign</p>
                <p>{selectedCallSign}</p>
              </div>
              <div>
                <p className="text-slate-500">Flag</p>
                <p>{selectedFlag}</p>
              </div>
              <div>
                <p className="text-slate-500">Length / Width</p>
                <p>
                  {selectedLength} · {selectedWidth}
                </p>
              </div>
              <div>
                <p className="text-slate-500">IMO</p>
                <p>{selectedImo}</p>
              </div>
              <div>
                <p className="text-slate-500">Added</p>
                <p>{selectedAddedAt}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Confidence</span>
              <span>{((selectedPosition?.confidence ?? 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300"
                style={{ width: `${(selectedPosition?.confidence ?? 0) * 100}%` }}
              />
            </div>
            {actionError ? (
              <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {actionError}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTrackToggle}
                disabled={actionState === 'working'}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                  isTracked
                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-200 hover:border-rose-300'
                    : 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300'
                } ${actionState === 'working' ? 'cursor-wait opacity-60' : ''}`}
              >
                {actionState === 'working' ? 'Updating' : isTracked ? 'Untrack' : 'Track'}
              </button>
            </div>
          </>
        )}
      </div>
      <ActiveTargetsList
        selectedVessel={selectedVessel}
        onSelect={onSelect}
        refreshSignal={refreshSignal}
        onDataUpdate={setWatchlistEntries}
      />
    </section>
  )
}
