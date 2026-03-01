import React, { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Clock, Wifi, WifiOff, Activity } from 'lucide-react'
import GlucoseCard from './components/GlucoseCard'
import GlucoseChart from './components/GlucoseChart'

const API_BASE = '/api'
const REFRESH_MS = 60000

export default function App() {
  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const [windowHours, setWindowHours] = useState(3)

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light"
  })

  /* THEME */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(t => (t === "light" ? "dark" : "light"))
  }

  /* COMPACT MODE */
  useEffect(() => {
    const checkCompact = () => {
      if (window.innerWidth < 420) {
        document.body.classList.add("compact")
      } else {
        document.body.classList.remove("compact")
      }
    }

    checkCompact()
    window.addEventListener("resize", checkCompact)
    return () => window.removeEventListener("resize", checkCompact)
  }, [])

  const intervalRef = useRef(null)
  const countdownRef = useRef(null)
  const windowHoursRef = useRef(3)

  const fetchAll = useCallback(async (first = false) => {
    first ? setIsLoading(true) : setIsRefreshing(true)
    setError(null)
    try {
      const [gRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/glucose?hours=${windowHoursRef.current}`, { cache: 'no-store' }),
        fetch(`${API_BASE}/stats`, { cache: 'no-store' }),
      ])
      if (!gRes.ok) throw new Error(`HTTP ${gRes.status}`)
      const gJson = await gRes.json()
      if (!gJson.success) throw new Error(gJson.error)
      setReadings(gJson.data || [])
      setLastSync(new Date().toLocaleTimeString('it-IT'))
      if (sRes.ok) {
        const sJson = await sRes.json()
        if (sJson.success) setStats(sJson.data)
      }
    } catch (e) {
      setError(e.message.includes('fetch')
        ? 'Backend non raggiungibile — verifica che il server sia attivo.'
        : e.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const resetCountdown = useCallback(() => {
    setCountdown(REFRESH_MS / 1000)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_MS / 1000 : c - 1)
    }, 1000)
  }, [])

  const handleWindowChange = (hours) => {
    windowHoursRef.current = hours
    setWindowHours(hours)
    fetchAll(false)
    resetCountdown()
  }

  const handleRefresh = () => {
    fetchAll(false)
    resetCountdown()
  }

  useEffect(() => {
    fetchAll(true)
    resetCountdown()
    intervalRef.current = setInterval(() => { fetchAll(false); resetCountdown() }, REFRESH_MS)
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current) }
  }, [fetchAll, resetCountdown])

  const latest = readings.length ? readings[readings.length - 1] : null
  const connected = !error && !isLoading

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">

      {/* Topbar */}
      <header className="flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--blue-l)] border border-[#bee3f8] flex items-center justify-center">
            <Activity size={16} color="#2b6cb0" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--text-primary)] tracking-wide">GlucoScope</div>
            <div className="text-[0.65rem] text-[var(--text-muted)] hidden sm:block">Monitoraggio continuo CGM</div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Connection status */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[0.72rem] font-medium transition-all ${connected
            ? 'bg-[#f0fff4] border-[#9ae6b4] text-[#276749]'
            : 'bg-[#fff5f5] border-[#fed7d7] text-[#c53030]'
            }`}>
            {connected ? <Wifi size={12} strokeWidth={2.5} /> : <WifiOff size={12} strokeWidth={2.5} />}
            {connected ? 'Connesso' : 'Disconnesso'}
          </div>

          {/* Countdown */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <Clock size={11} strokeWidth={2} />
            <span className="flex items-center gap-1">
              Sync in <span className="text-[var(--blue)] font-semibold">{countdown}s</span>
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--blue)] text-white rounded-lg text-xs font-semibold border-none cursor-pointer disabled:opacity-60 transition-all hover:brightness-110"
          >
            <RefreshCw
              size={12}
              strokeWidth={2.5}
              style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
            />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] hover:brightness-110 transition-all"
          >
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-hidden p-3 sm:p-4">

        {/* Loading */}
        {isLoading && (
          <div className="h-full flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="card flex-1" style={{
                background: 'linear-gradient(90deg, var(--surface-2) 25%, #edf2f7 50%, var(--surface-2) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        )}

        {/* Errore */}
        {!isLoading && error && (
          <div className="card p-5 border-l-4 border-l-[var(--red)]">
            <div className="font-semibold text-[var(--red)] mb-1">Errore di connessione</div>
            <div className="text-sm text-[var(--text-secondary)]">{error}</div>
            <button onClick={handleRefresh} className="mt-2 text-xs text-[var(--blue)] bg-transparent border-none cursor-pointer p-0 font-semibold">
              Riprova →
            </button>
          </div>
        )}

        {/* Nessun dato */}
        {!isLoading && !error && readings.length === 0 && (
          <div className="h-full card flex items-center justify-center">
            <div className="text-[var(--text-muted)] text-sm">In attesa di dati da Nightscout…</div>
          </div>
        )}

        {/* Layout dati */}
        {!isLoading && !error && readings.length > 0 && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">

            {/* Colonna sinistra */}
            <div className="flex flex-col gap-3 overflow-auto lg:overflow-hidden">

              {/* GlucoseCard — SEMPRE visibile */}
              <div className="glucose-card">
                <GlucoseCard reading={latest} />
              </div>

              {/* Stats 24h — NASCOSTA su mobile */}
              <div className="card p-4 flex flex-col gap-3 flex-shrink-0 stats-24h">
                <div className="label">Statistiche 24 ore</div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Media', value: stats?.avg_sgv, unit: 'mg/dL', color: 'text-[var(--blue)]' },
                    { label: 'Letture', value: stats?.total_readings, unit: '', color: 'text-[var(--text-primary)]' },
                    {
                      label: 'Minimo', value: stats?.min_sgv, unit: 'mg/dL',
                      color: stats?.min_sgv < 70 ? 'text-[#dc2626]' : 'text-[var(--text-primary)]',
                    },
                    {
                      label: 'Massimo', value: stats?.max_sgv, unit: 'mg/dL',
                      color: stats?.max_sgv > 180 ? 'text-[#dc2626]' : 'text-[var(--text-primary)]',
                    },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 shadow-sm">
                      <div className="label mb-1">{s.label}</div>
                      <div className={`text-xl font-bold mono leading-none ${s.color}`}>
                        {s.value ?? '—'}
                        {s.unit && <span className="text-xs font-normal text-[var(--text-muted)] ml-1">{s.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIR — SEMPRE visibile */}
              {stats && (
                <div className="card p-4 flex flex-col gap-3 flex-shrink-0 tir-box">
                  <div className="flex items-center justify-between">
                    <div className="label">Time In Range 24h</div>
                    <span
                      className="text-xl font-bold mono"
                      style={{
                        color:
                          stats.time_in_range_percent >= 70
                            ? 'var(--green)'
                            : stats.time_in_range_percent >= 50
                              ? 'var(--orange)'
                              : 'var(--red)'
                      }}
                    >
                      {stats.time_in_range_percent ?? '—'}%
                    </span>
                  </div>

                  {/* Barra TIR */}
                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${stats.time_in_range_percent ?? 0}%`,
                        background:
                          stats.time_in_range_percent >= 70
                            ? 'var(--green)'
                            : stats.time_in_range_percent >= 50
                              ? 'var(--orange)'
                              : 'var(--red)'
                      }}
                    />
                  </div>

                  {/* Box basso / ok / alto */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div
                      className="rounded-md py-1.5 shadow-sm"
                      style={{
                        background: 'var(--tir-low-bg)',
                        color: 'var(--tir-low-color)'
                      }}
                    >
                      <div className="text-base font-bold mono">{stats.low_count ?? 0}</div>
                      <div className="text-[0.65rem] text-[var(--text-muted)]">Basso</div>
                    </div>

                    <div
                      className="rounded-md py-1.5 shadow-sm"
                      style={{
                        background: 'var(--tir-inrange-bg)',
                        color: 'var(--tir-inrange-color)'
                      }}
                    >
                      <div className="text-base font-bold mono">{stats.in_range_count ?? 0}</div>
                      <div className="text-[0.65rem] text-[var(--text-muted)]">OK</div>
                    </div>

                    <div
                      className="rounded-md py-1.5 shadow-sm"
                      style={{
                        background: 'var(--tir-high-bg)',
                        color: 'var(--tir-high-color)'
                      }}
                    >
                      <div className="text-base font-bold mono">{stats.high_count ?? 0}</div>
                      <div className="text-[0.65rem] text-[var(--text-muted)]">Alto</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Colonna destra: grafico — SEMPRE visibile */}
            <div className="overflow-hidden min-h-0 chart-container">
              <GlucoseChart
                data={readings}
                windowHours={windowHours}
                onWindowChange={handleWindowChange}
                lastSync={lastSync}
              />
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  )
}
