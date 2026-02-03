import React, { useEffect, useState } from 'react'
import { fetchStatus, SystemStatus } from '../services/api'

const StatusIndicator = ({ label, status }: { label: string; status: string }) => {
  let colorClass = 'bg-gray-500'
  if (status === 'ONLINE') colorClass = 'bg-emerald-500'
  if (status === 'OFFLINE') colorClass = 'bg-red-500'
  if (status === 'DEGRADED') colorClass = 'bg-amber-500'

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colorClass} animate-pulse`} />
        <span className={`text-xs font-bold ${status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500'}`}>
          {status}
        </span>
      </div>
    </div>
  )
}

const MetricRow = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <div className="flex items-center justify-between py-1 border-t border-slate-800/50 mt-1 pt-2">
    <span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span>
    <span className="text-cyan-400 font-mono text-sm">
      {value}
      {unit && <span className="text-slate-500 ml-1 text-xs">{unit}</span>}
    </span>
  </div>
)

const SystemStatusWidget: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await fetchStatus()
        setStatus(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch status:', err)
        setError('Failed to connect')
      }
    }

    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md border border-red-900/30 rounded-lg p-4 w-64">
        <div className="text-red-400 text-xs font-mono">System Status: Offline</div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-lg p-4 w-64 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
        <div className="h-20 bg-slate-800/50 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 w-72 shadow-xl shadow-black/40">
      <h3 className="text-slate-200 text-sm font-semibold mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        System Health
      </h3>
      
      <div className="space-y-1">
        <StatusIndicator label="AIS Stream" status={status.aisStream} />
        <StatusIndicator label="Radar Link" status={status.radar} />
        <StatusIndicator label="Database" status={status.database} />
        <StatusIndicator label="Redis Cache" status={status.redis} />
      </div>

      {status.metrics && (
        <div className="mt-3">
          <MetricRow 
            label="Throughput" 
            value={status.metrics.messagesPerMinute} 
            unit="msg/min" 
          />
          <MetricRow 
            label="Active Tracks" 
            value={status.metrics.totalTrackedVessels} 
          />
        </div>
      )}
      
      <div className="mt-3 text-[10px] text-slate-600 font-mono text-right">
        Updated: {new Date(status.lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default SystemStatusWidget
