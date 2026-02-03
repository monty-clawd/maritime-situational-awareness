import { useEffect, useMemo, useState } from 'react'
import ActiveTargetsList from '@/components/ActiveTargetsList'
import ReportModal from '@/components/ReportModal'
import { addToWatchlist, removeFromWatchlist, analyzeVessel, fetchWeather, type WeatherInfo } from '@/services/api'
import type { WatchlistEntry, Alert, AnalysisResult } from '@/types/maritime'
import { formatKnots, formatLatLon } from '@/utils/format'

type VesselPanelProps = {
  selectedVessel: number | null
  onSelect: (mmsi: number) => void
  onViewHistory: () => void
  activeAlerts?: Alert[]
}

export default function VesselPanel({ selectedVessel, onSelect, onViewHistory, activeAlerts }: VesselPanelProps) {
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([])
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [actionState, setActionState] = useState<'idle' | 'working'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const selectedEntry = useMemo(
    () =>
      selectedVessel === null
        ? null
        : watchlistEntries.find((vessel) => vessel.mmsi === selectedVessel) ?? null,
    [selectedVessel, watchlistEntries],
  )
  
  useEffect(() => {
    setAnalysisResult(null)
    setActionError(null)
    setWeather(null)
    setIsReportModalOpen(false)
  }, [selectedVessel])

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

  const handleAnalyze = async () => {
    if (selectedVessel === null || isAnalyzing) return
    setIsAnalyzing(true)
    setActionError(null)
    try {
        const result = await analyzeVessel(selectedVessel)
        setAnalysisResult(result)
    } catch (err) {
        setActionError('Analysis failed.')
    } finally {
        setIsAnalyzing(false)
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

  useEffect(() => {
    if (selectedPosition?.latitude && selectedPosition?.longitude) {
        fetchWeather(selectedPosition.latitude, selectedPosition.longitude)
            .then(setWeather)
            .catch(() => setWeather(null))
    } else {
        setWeather(null)
    }
  }, [selectedPosition?.latitude, selectedPosition?.longitude])

  const integrityAlert = activeAlerts?.find((a) =>
    ['SPEED_ANOMALY', 'TELEPORT_ANOMALY', 'POSITION_MISMATCH'].includes(a.type),
  )

  const reportAlerts: string[] = []
  if (integrityAlert) reportAlerts.push(`${integrityAlert.type}: ${integrityAlert.details}`)
  if (analysisResult?.deviations) {
    analysisResult.deviations.forEach(d => reportAlerts.push(`Behavior: ${d.description}`))
  }

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

            {weather && (
              <div className="mt-3 rounded border border-slate-700/50 bg-slate-900/40 p-3">
                 <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80">Local Weather</p>
                 <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                        <span className="text-slate-500">Wind: </span>
                        {weather.windSpeedKnots} kn {weather.windDirection}°
                    </div>
                    {weather.waveHeightMeters !== undefined && (
                        <div>
                             <span className="text-slate-500">Waves: </span>
                             {weather.waveHeightMeters} m
                        </div>
                    )}
                     {weather.temperature !== undefined && (
                        <div>
                             <span className="text-slate-500">Temp: </span>
                             {weather.temperature}°C
                        </div>
                    )}
                 </div>
              </div>
            )}
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
            
            {/* AI Analysis Result */}
            {analysisResult && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-indigo-500/30 bg-indigo-950/40 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">AI Behavior Analysis</p>
                    <p className="text-xs leading-relaxed text-indigo-100 font-medium">{analysisResult.explanation}</p>
                    
                    {analysisResult.deviations.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {analysisResult.deviations.map((d, i) => (
                                <div key={i} className="flex items-start gap-2 rounded bg-indigo-950/60 p-1.5 text-[10px] text-amber-200 border border-amber-500/20">
                                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                    <span>{d.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                     <p className="mt-2 text-[9px] text-indigo-400/60 text-right">Powered by Gemini</p>
                </div>
            )}

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
                className={`flex-1 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                  isTracked
                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-200 hover:border-rose-300'
                    : 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300'
                } ${actionState === 'working' ? 'cursor-wait opacity-60' : ''}`}
              >
                {actionState === 'working' ? 'Updating' : isTracked ? 'Untrack' : 'Track'}
              </button>
              
               <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`flex-1 rounded-full border border-indigo-400/60 bg-indigo-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-indigo-200 hover:border-indigo-300 transition ${isAnalyzing ? 'cursor-wait opacity-60' : ''}`}
              >
                {isAnalyzing ? 'Thinking...' : 'Analyze'}
              </button>

              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="flex-1 rounded-full border border-slate-500/60 bg-slate-600/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 hover:border-slate-300 transition"
              >
                Report
              </button>
              
              <button
                type="button"
                onClick={onViewHistory}
                className="flex-1 rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-sky-200 hover:border-sky-300 transition"
              >
                History
              </button>
            </div>

            {/* Report Modal */}
            {selectedPosition && (
              <ReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)}
                vessel={{
                    mmsi: selectedVessel,
                    name: selectedName,
                    latitude: selectedPosition.latitude,
                    longitude: selectedPosition.longitude
                }}
                weather={weather}
                alerts={reportAlerts}
              />
            )}
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
