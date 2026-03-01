import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowUp, ArrowDown, ArrowRight,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

const DIRECTIONS = {
  'DoubleUp': { Icon: ArrowUp, label: 'Salita rapida', color: 'var(--red)', double: true },
  'SingleUp': { Icon: ArrowUp, label: 'In salita', color: 'var(--orange)', double: false },
  'FortyFiveUp': { Icon: ArrowUpRight, label: 'Lieve salita', color: 'var(--orange)', double: false },
  'Flat': { Icon: ArrowRight, label: 'Stabile', color: 'var(--green)', double: false },
  'FortyFiveDown': { Icon: ArrowDownRight, label: 'Lieve discesa', color: 'var(--orange)', double: false },
  'SingleDown': { Icon: ArrowDown, label: 'In discesa', color: 'var(--orange)', double: false },
  'DoubleDown': { Icon: ArrowDown, label: 'Discesa rapida', color: 'var(--red)', double: true },
}


function getStatus(sgv) {
  if (sgv < 54) return { label: 'IPOGLICEMIA GRAVE', color: 'var(--red)', bg: 'var(--bg-hypo-severe)', border: 'var(--red)', severe: true }
  if (sgv < 70) return { label: 'IPOGLICEMIA', color: 'var(--red)', bg: 'var(--bg-hypo)', border: 'var(--red)', severe: false }
  if (sgv > 250) return { label: 'IPERGLICEMIA GRAVE', color: 'var(--orange)', bg: 'var(--bg-hyper-severe)', border: 'var(--orange)', severe: true }
  if (sgv > 180) return { label: 'IPERGLICEMIA', color: 'var(--orange)', bg: 'var(--bg-hyper)', border: 'var(--orange)', severe: false }
  return { label: 'IN RANGE', color: 'var(--green)', bg: 'var(--bg-inrange)', border: 'var(--green)', severe: false }
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
  const trend = DIRECTIONS[direction] || { Icon: Minus, label: 'N/D', color: '#8a9ab0', double: false }
  const { Icon } = trend

  // Animazione valore quando cambia
  const prevValue = useRef(sgv)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (prevValue.current !== sgv) {
      const improved = sgv > prevValue.current
      setFlash(improved ? 'flash-green' : 'flash-red')
      prevValue.current = sgv
      const t = setTimeout(() => setFlash(null), 450)
      return () => clearTimeout(t)
    }
  }, [sgv])

  return (
    <div
      className={`card p-4 flex-shrink-0 transition-all duration-300 ${status.severe ? 'shake' : ''
        }`}
      style={{
        borderLeft: `5px solid ${status.color}`,
        background: status.bg,
      }}
    >
      <div className="label mb-2">Glicemia attuale</div>

      {/* Valore + trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-5xl font-bold mono leading-none transition-all duration-300 ${flash}`}
            style={{ color: status.color }}
          >
            {sgv}
          </span>
          <span className="text-sm text-[var(--text-muted)]">mg/dL</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex flex-col items-center" style={{ color: trend.color }}>
            {trend.double ? (
              <>
                <Icon size={22} strokeWidth={2.5} />
                <Icon size={22} strokeWidth={2.5} className="-mt-2" />
              </>
            ) : (
              <Icon size={26} strokeWidth={2.5} />
            )}
          </div>
          <span className="text-[0.68rem] text-[var(--text-secondary)]">{trend.label}</span>
        </div>
      </div>

      {/* Badge + orario */}
      <div className="flex items-center justify-between mt-3">
        <span
          className="text-[0.68rem] font-bold tracking-widest px-2.5 py-1 rounded-md border"
          style={{
            background: status.bg,
            color: status.color,
            borderColor: status.border,
          }}
        >
          {status.label}
        </span>

        <div className="text-right">
          <div className="text-[0.72rem] text-[var(--text-muted)]">{timeAgo(timestamp)}</div>
          <div className="mono text-[0.72rem] text-[var(--text-secondary)]">
            {new Date(timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Animazioni CSS */}
      <style>{`
        .flash-green {
          animation: flashGreen 0.45s ease-out;
        }
        .flash-red {
          animation: flashRed 0.45s ease-out;
        }
        @keyframes flashGreen {
          0% { color: #16a34a; transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes flashRed {
          0% { color: #dc2626; transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .shake {
          animation: shakeAnim 0.35s ease-in-out;
        }
        @keyframes shakeAnim {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
