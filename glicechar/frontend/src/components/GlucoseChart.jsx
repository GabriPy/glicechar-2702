import React, { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea,
} from 'recharts'

const WINDOWS = [
  { label: '1h',  hours: 1  },
  { label: '3h',  hours: 3  },
  { label: '6h',  hours: 6  },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
]

const ZONES = [
  { y1: 50,  y2: 54,  fill: 'rgba(220,38,38,0.13)' },
  { y1: 54,  y2: 70,  fill: 'rgba(234,179,8,0.13)' },
  { y1: 70,  y2: 180, fill: 'rgba(22,163,74,0.09)' },
  { y1: 180, y2: 250, fill: 'rgba(234,179,8,0.13)' },
  { y1: 250, y2: 300, fill: 'rgba(220,38,38,0.13)' },
]

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const color =
    d.sgv < 54  ? '#dc2626' : d.sgv < 70  ? '#ca8a04' :
    d.sgv > 250 ? '#dc2626' : d.sgv > 180 ? '#ca8a04' : '#16a34a'
  const label =
    d.sgv < 54  ? 'Ipoglicemia grave' : d.sgv < 70  ? 'Ipoglicemia lieve' :
    d.sgv > 250 ? 'Iperglicemia grave': d.sgv > 180 ? 'Iperglicemia lieve': 'In range'
  const bg =
    d.sgv < 54  ? '#fef2f2' : d.sgv < 70  ? '#fefce8' :
    d.sgv > 250 ? '#fef2f2' : d.sgv > 180 ? '#fefce8' : '#f0fdf4'

  return (
    <div className="bg-white rounded-xl shadow-xl p-3 min-w-[150px]" style={{ border: `1.5px solid ${color}` }}>
      <div className="text-[0.68rem] text-[var(--text-muted)] mb-1.5">
        {new Date(d.timestamp).toLocaleTimeString('it-IT')}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-2xl font-bold mono leading-none" style={{ color }}>{d.sgv}</span>
        <span className="text-xs text-[var(--text-muted)]">mg/dL</span>
      </div>
      <div className="text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded inline-block" style={{ background: bg, color }}>
        {label.toUpperCase()}
      </div>
    </div>
  )
}

export default function GlucoseChart({ data, windowHours, onWindowChange, lastSync }) {
  const chartData = useMemo(() => {
    if (!data?.length) return []
    return data.map(d => ({ ...d, time: fmtTime(d.timestamp) }))
  }, [data])

  const sgvValues = chartData.map(d => d.sgv)
  const periodAvg = sgvValues.length ? Math.round(sgvValues.reduce((a,b)=>a+b,0)/sgvValues.length) : null
  const periodMin = sgvValues.length ? Math.min(...sgvValues) : null
  const periodMax = sgvValues.length ? Math.max(...sgvValues) : null
  const periodTir = sgvValues.length
    ? Math.round(sgvValues.filter(v => v >= 70 && v <= 180).length / sgvValues.length * 100)
    : null

  const xInterval = Math.ceil(chartData.length / 7)

  return (
    <div className="card h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 pt-4 pb-0 flex-shrink-0">
        <div>
          <div className="label mb-0.5">Andamento glicemico</div>
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {chartData.length} rilevazioni &middot; ultime {windowHours}h
            {lastSync && <span className="text-[var(--text-muted)] text-xs ml-2">&middot; {lastSync}</span>}
          </div>
        </div>

        {/* Selettore finestra */}
        <div className="flex gap-0.5 bg-[var(--bg)] rounded-lg p-1 border border-[var(--border)]">
          {WINDOWS.map(w => (
            <button
              key={w.hours}
              onClick={() => onWindowChange(w.hours)}
              className={`px-3 py-1 rounded-md text-xs border-none cursor-pointer transition-all duration-150 ${
                windowHours === w.hours
                  ? 'bg-white text-[var(--blue)] font-semibold shadow-sm'
                  : 'bg-transparent text-[var(--text-muted)] font-normal'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini stats periodo */}
      <div className="flex flex-wrap border-t border-b border-[var(--border)] mt-3 flex-shrink-0">
        {[
          { label: 'Media',   value: periodAvg,  unit: 'mg/dL', color: 'var(--blue)' },
          { label: 'Minimo',  value: periodMin,  unit: 'mg/dL', color: periodMin < 54 ? '#dc2626' : periodMin < 70 ? '#ca8a04' : 'var(--text-primary)' },
          { label: 'Massimo', value: periodMax,  unit: 'mg/dL', color: periodMax > 250 ? '#dc2626' : periodMax > 180 ? '#ca8a04' : 'var(--text-primary)' },
          { label: 'TIR',     value: periodTir != null ? `${periodTir}%` : null, unit: '', color: periodTir >= 70 ? 'var(--green)' : periodTir >= 50 ? '#ca8a04' : '#dc2626' },
        ].map((s, i, arr) => (
          <div key={s.label} className={`flex-1 min-w-[80px] px-4 py-2 ${i < arr.length - 1 ? 'border-r border-[var(--border)]' : ''}`}>
            <div className="label mb-0.5">{s.label}</div>
            <div className="text-lg font-bold mono leading-none" style={{ color: s.color }}>
              {s.value ?? '—'}
              {s.unit && <span className="text-[0.65rem] font-normal text-[var(--text-muted)] ml-1">{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Grafico */}
      <div className="flex-1 min-h-0 px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} strokeWidth={1} />
            <XAxis
              dataKey="time"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={xInterval}
            />
            <YAxis
              domain={[50, 300]}
              ticks={[50, 70, 100, 140, 180, 220, 250, 300]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2b6cb0', strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.35 }} />

            {ZONES.map(z => (
              <ReferenceArea key={z.y1} y1={z.y1} y2={z.y2} fill={z.fill} fillOpacity={1} />
            ))}

            <ReferenceLine y={54}  stroke="#dc2626" strokeWidth={1}   strokeDasharray="5 4"
              label={{ value: '54',  position: 'insideTopRight', fill: '#dc2626', fontSize: 9, fontFamily: 'IBM Plex Mono', dy: -3 }} />
            <ReferenceLine y={70}  stroke="#ca8a04" strokeWidth={1.5} strokeDasharray="5 4"
              label={{ value: '70',  position: 'insideTopRight', fill: '#ca8a04', fontSize: 9, fontFamily: 'IBM Plex Mono', dy: -3 }} />
            <ReferenceLine y={180} stroke="#ca8a04" strokeWidth={1.5} strokeDasharray="5 4"
              label={{ value: '180', position: 'insideTopRight', fill: '#ca8a04', fontSize: 9, fontFamily: 'IBM Plex Mono', dy: -3 }} />
            <ReferenceLine y={250} stroke="#dc2626" strokeWidth={1}   strokeDasharray="5 4"
              label={{ value: '250', position: 'insideTopRight', fill: '#dc2626', fontSize: 9, fontFamily: 'IBM Plex Mono', dy: -3 }} />

            <Area type="monotone" dataKey="sgv" stroke="none" fill="url(#lineGrad)" animationDuration={500} />
            <Line
              type="monotone" dataKey="sgv"
              stroke="#16a34a" strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#16a34a', stroke: '#fff', strokeWidth: 2.5 }}
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}