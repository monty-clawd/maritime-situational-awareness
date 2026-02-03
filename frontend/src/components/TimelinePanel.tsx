import { useEffect, useState } from 'react'
import { fetchHistory, type HistoryResult } from '@/services/api'
import { formatLatLon, formatKnots } from '@/utils/format'

type TimelinePanelProps = {
  mmsi: number | null
  onClose: () => void
  onLoadTrack: (track: GeoJSON.Feature<GeoJSON.LineString> | null) => void
}

export default function TimelinePanel({ mmsi, onClose, onLoadTrack }: TimelinePanelProps) {
  const [history, setHistory] = useState<HistoryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mmsi) {
      setHistory(null)
      onLoadTrack(null)
      return
    }

    setLoading(true)
    setError(null)
    fetchHistory(mmsi)
      .then((data) => {
        setHistory(data)
        onLoadTrack(data.track)
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to load history.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [mmsi])

  // Cleanup on unmount
  useEffect(() => {
    return () => onLoadTrack(null)
  }, [])

  if (!mmsi) return null

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex items-center justify-between">
        <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Investigation</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">Event Timeline</h2>
        </div>
        <button 
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
        {loading && <p className="text-sm text-slate-400">Loading history...</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        
        {!loading && !error && history && (
          <div className="space-y-4">
             <div className="flex justify-between text-xs text-slate-500">
                <span>Start: {new Date(history.range.start).toLocaleString()}</span>
                <span>Points: {history.points.length}</span>
             </div>

             <div className="relative border-l border-slate-800 ml-2 space-y-6">
                {history.points.slice().reverse().map((point, i) => (
                    <div key={i} className="relative ml-4">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border border-slate-700 bg-slate-900" />
                        <p className="text-xs text-slate-400">{new Date(point.timestamp).toLocaleTimeString()}</p>
                        <div className="mt-1 text-sm text-slate-200">
                            {formatLatLon(point.latitude, point.longitude)}
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 mt-1">
                            <span>{formatKnots(point.speed)}</span>
                            <span>{point.heading}°</span>
                            <span>{point.source}</span>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </section>
  )
}
