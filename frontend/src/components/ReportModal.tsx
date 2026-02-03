// import ReactMarkdown from 'react-markdown' // Removed to avoid dependency
import { useState, useEffect } from 'react'
import { generateReport, type WeatherInfo } from '@/services/api'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  vessel: {
    mmsi: number
    name?: string
    latitude: number
    longitude: number
  }
  weather: WeatherInfo | null
  alerts: string[]
}

export default function ReportModal({ isOpen, onClose, vessel, weather, alerts }: ReportModalProps) {
  const [report, setReport] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReport('')
      setError(null)
      setIsEditing(false)
    }
  }, [isOpen])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    
    let weatherString = undefined
    if (weather) {
      weatherString = `Wind: ${weather.windSpeedKnots}kn @ ${weather.windDirection}°, Temp: ${weather.temperature || '--'}°C`
      if (weather.waveHeightMeters) weatherString += `, Waves: ${weather.waveHeightMeters}m`
    }

    try {
      const result = await generateReport({
        mmsi: vessel.mmsi,
        vesselName: vessel.name,
        lat: vessel.latitude,
        lon: vessel.longitude,
        alerts,
        weather: weatherString
      })
      setReport(result.report)
    } catch (err) {
      setError('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    // Simple PDF export via browser print
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Incident Report - ${vessel.name || vessel.mmsi}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              pre { background: #f4f4f4; padding: 10px; white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${report}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-100">Incident Report Generator</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-h-[70vh]">
          {error && (
             <div className="mb-4 rounded bg-rose-500/20 p-3 text-sm text-rose-200 border border-rose-500/40">
                {error}
             </div>
          )}

          {!report && !loading && (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center text-slate-400">
              <p>Ready to generate report for <strong>{vessel.name || vessel.mmsi}</strong>.</p>
              <p className="text-xs max-w-md">Context included: Location, Weather ({weather ? 'Available' : 'Unavailable'}), Active Alerts ({alerts.length}).</p>
              <button
                onClick={handleGenerate}
                className="rounded-full bg-cyan-600 px-6 py-2 font-semibold text-white hover:bg-cyan-500 transition"
              >
                Generate Report
              </button>
            </div>
          )}

          {loading && (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
                <p className="text-slate-300 animate-pulse">Drafting report with AI...</p>
             </div>
          )}

          {report && (
            <div className="space-y-4">
               <div className="flex justify-end space-x-2 text-xs">
                 <button 
                   onClick={() => setIsEditing(!isEditing)} 
                   className="text-cyan-300 hover:text-cyan-200"
                 >
                   {isEditing ? 'Preview' : 'Edit'}
                 </button>
               </div>

               {isEditing ? (
                 <textarea
                   value={report}
                   onChange={(e) => setReport(e.target.value)}
                   className="h-96 w-full rounded border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                 />
               ) : (
                 <div className="prose prose-invert prose-sm max-w-none rounded border border-slate-800 bg-slate-950/50 p-6 whitespace-pre-wrap font-sans">
                    {report}
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 p-6">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-slate-300 hover:text-white"
          >
            Close
          </button>
          {report && (
            <>
              <button
                 onClick={handleGenerate}
                 className="rounded px-4 py-2 text-sm text-cyan-300 hover:text-cyan-200"
              >
                Regenerate
              </button>
              <button
                onClick={handleDownload}
                className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                Print / PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
