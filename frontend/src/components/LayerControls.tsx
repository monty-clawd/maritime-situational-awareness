import type { ChangeEvent } from 'react'

type LayerKey = 'ais' | 'radar' | 'fused' | 'alerts'

type LayerVisibility = {
  ais: boolean
  radar: boolean
  fused: boolean
  alerts: boolean
}

type LayerControlsProps = {
  layerVisibility: LayerVisibility
  onToggle: (layer: LayerKey) => void
}

const layers: Array<{ id: LayerKey; label: string; description: string }> = [
  { id: 'ais', label: 'AIS Tracks', description: 'Commercial vessel positions' },
  { id: 'radar', label: 'Radar Tracks', description: 'Coastal radar returns' },
  { id: 'fused', label: 'Fused Tracks', description: 'Kalman-smoothed paths' },
  { id: 'alerts', label: 'Alerts', description: 'Integrity events' },
]

export default function LayerControls({ layerVisibility, onToggle }: LayerControlsProps) {
  const handleChange = (layer: LayerKey) => (_event: ChangeEvent<HTMLInputElement>) => {
    onToggle(layer)
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Map Layers</p>
          <p className="mt-2 text-sm text-slate-300">Toggle data feeds on the live map.</p>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
          Live
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {layers.map((layer) => (
          <label
            key={layer.id}
            className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 transition hover:border-cyan-500/40 hover:bg-slate-900/70"
          >
            <div>
              <p className="text-sm font-medium text-slate-100">{layer.label}</p>
              <p className="text-xs text-slate-400">{layer.description}</p>
            </div>
            <span className="relative inline-flex h-5 w-10 items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={layerVisibility[layer.id]}
                onChange={handleChange(layer.id)}
              />
              <span className="absolute inset-0 rounded-full bg-slate-700/70 transition peer-checked:bg-cyan-500/70" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white/90 transition peer-checked:translate-x-5" />
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

export type { LayerKey, LayerVisibility }
