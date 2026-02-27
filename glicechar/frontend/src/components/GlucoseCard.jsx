import React from 'react'
import {
  ArrowUp, ArrowDown, ArrowRight,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

const DIRECTIONS = {
  'DoubleUp':      { Icon: ArrowUp,        label: 'Salita rapida',  color: '#e53e3e', double: true  },
  'SingleUp':      { Icon: ArrowUp,        label: 'In salita',      color: '#dd6b20', double: false },
  'FortyFiveUp':   { Icon: ArrowUpRight,   label: 'Lieve salita',   color: '#d69e2e', double: false },
  'Flat':          { Icon: ArrowRight,     label: 'Stabile',        color: '#38a169', double: false },
  'FortyFiveDown': { Icon: ArrowDownRight, label: 'Lieve discesa',  color: '#d69e2e', double: false },
  'SingleDown':    { Icon: ArrowDown,      label: 'In discesa',     color: '#dd6b20', double: false },
  'DoubleDown':    { Icon: ArrowDown,      label: 'Discesa rapida', color: '#e53e3e', double: true  },
}

function getStatus(sgv) {
  if (sgv < 54)  return { label: 'IPOGLICEMIA GRAVE', color: '#e53e3e', bg: '#fff5f5', border: '#fed7d7' }
  if (sgv < 70)  return { label: 'IPOGLICEMIA',       color: '#e53e3e', bg: '#fff5f5', border: '#fed7d7' }
  if (sgv > 250) return { label: 'IPERGLICEMIA GRAVE',color: '#c05621', bg: '#fffaf0', border: '#fbd38d' }
  if (sgv > 180) return { label: 'IPERGLICEMIA',      color: '#dd6b20', bg: '#fffaf0', border: '#fbd38d' }
  return               { label: 'IN RANGE',           color: '#276749', bg: '#f0fff4', border: '#9ae6b4' }
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'Adesso'
  if (m === 1) return '1 min fa'
  if (m < 60) return `${m} min fa`
  return `${Math.floor(m / 60)}h fa`
}

export default function GlucoseCard({ reading }) {
  if (!reading) return null
  const { sgv, direction, timestamp } = reading
  const status = getStatus(sgv)
  const trend  = DIRECTIONS[direction] || { Icon: Minus, label: 'N/D', color: '#8a9ab0', double: false }
  const { Icon } = trend

  return (
    <div className="card p-4 flex-shrink-0" style={{ borderLeft: `4px solid ${status.color}` }}>
      <div className="label mb-2">Glicemia attuale</div>

      {/* Valore + trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold mono leading-none" style={{ color: status.color }}>
            {sgv}
          </span>
          <span className="text-sm text-[var(--text-muted)]">mg/dL</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex flex-col items-center" style={{ color: trend.color }}>
            {trend.double
              ? <><Icon size={20} strokeWidth={2.5} /><Icon size={20} strokeWidth={2.5} className="-mt-2" /></>
              : <Icon size={24} strokeWidth={2.5} />
            }
          </div>
          <span className="text-[0.68rem] text-[var(--text-secondary)]">{trend.label}</span>
        </div>
      </div>

      {/* Badge + orario */}
      <div className="flex items-center justify-between mt-3">
        <span
          className="text-[0.68rem] font-bold tracking-widest px-2.5 py-1 rounded"
          style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
        >
          {status.label}
        </span>
        <div className="text-right">
          <div className="text-[0.72rem] text-[var(--text-muted)]">{timeAgo(timestamp)}</div>
          <div className="mono text-[0.72rem] text-[var(--text-secondary)]">
            {new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}