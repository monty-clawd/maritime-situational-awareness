import { useEffect, useMemo, useState } from 'react'
import { fetchWatchlist } from '@/services/api'
import type { WatchlistEntry } from '@/types/maritime'
import { formatKnots, formatLatLon } from '@/utils/format'

type ActiveTargetsListProps = {
  selectedVessel: number | null
  onSelect: (mmsi: number) => void
  refreshSignal?: number
  onDataUpdate?: (entries: WatchlistEntry[]) => void
}

type LoadState = 'idle' | 'loading' | 'error'

export default function ActiveTargetsList({
  selectedVessel,
  onSelect,
  refreshSignal,
  onDataUpdate,
}: ActiveTargetsListProps) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let isActive = true

    const loadWatchlist = async () => {
      setLoadState('loading')
      setErrorMessage(null)
      try {
        const data = await fetchWatchlist()
        if (!isActive) return
        setEntries(data)
        onDataUpdate?.(data)
        setLoadState('idle')
      } catch (err) {
        if (!isActive) return
        setLoadState('error')
        setErrorMessage('Unable to load watchlist.')
      }
    }

    loadWatchlist()

    return () => {
      isActive = false
    }
  }, [refreshSignal, retryToken, onDataUpdate])

  const hasEntries = entries.length > 0
  const listTitle = useMemo(() => {
    if (loadState === 'loading') return 'Loading watchlist...'
    if (loadState === 'error') return 'Watchlist unavailable'
    if (!hasEntries) return 'No tracked targets'
    return 'Tracked targets'
  }, [hasEntries, loadState])

  return (
    <div className="space-y-3 overflow-auto pr-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
        <span>{listTitle}</span>
        {loadState === 'error' ? (
          <button
            type="button"
            onClick={() => setRetryToken((prev) => prev + 1)}
            className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
      {loadState === 'loading' ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-sm text-slate-400">
          Fetching watchlist targets...
        </div>
      ) : null}
      {loadState === 'error' && errorMessage ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
      {!hasEntries && loadState === 'idle' ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-sm text-slate-400">
          Add a vessel from the map to start tracking.
        </div>
      ) : null}
      {entries.map((vessel) => (
        <button
          key={vessel.mmsi}
          type="button"
          onClick={() => onSelect(vessel.mmsi)}
          className={`w-full rounded-xl border p-4 text-left transition ${
            vessel.mmsi === selectedVessel
              ? 'border-cyan-400/70 bg-cyan-500/10'
              : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
          }`}
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
              <p>
                {vessel.lastPosition
                  ? formatLatLon(vessel.lastPosition.latitude, vessel.lastPosition.longitude)
                  : '--'}
              </p>
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
        </button>
      ))}
    </div>
  )
}
