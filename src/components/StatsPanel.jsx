import React, { useEffect, useRef, useState } from 'react'
import {
  Gamepad2, Grid3X3, TrendingUp,
  Activity, Sparkles
} from 'lucide-react'
import { useStore } from '../store/useStore'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

export default function StatsPanel() {
  const { games, apps, recentLaunches } = useStore()

  const [sys, setSys] = useState(null)
  const [cpu, setCpu] = useState(0)
  const prevCpu = useRef(null)

  useEffect(() => {
    if (!isElectron) return

    let alive = true

    const calcCPU = (prev, next) => {
      if (!prev) return 0

      const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0)
      const nextTotal = Object.values(next).reduce((a, b) => a + b, 0)

      const totalDiff = nextTotal - prevTotal
      const idleDiff = next.idle - prev.idle

      if (totalDiff === 0) return 0

      return 100 * (1 - idleDiff / totalDiff)
    }

    const fetch = async () => {
      try {
        const data = await window.arcadeOS.system.info()
        if (!alive) return

        // ✅ TRUE CPU calculation
        if (data.cpuTimes) {
          const usage = calcCPU(prevCpu.current, data.cpuTimes)
          prevCpu.current = data.cpuTimes
          setCpu(Math.min(100, Math.max(0, usage)))
        } else {
          // fallback
          setCpu(data.cpu || 0)
        }

        setSys(data)
      } catch {}
    }

    fetch()
    const interval = setInterval(fetch, 300)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  const totalLaunches = [...games, ...apps]
    .reduce((s, i) => s + (i.launchCount || 0), 0)

  const topGame = [...games]
    .sort((a, b) => (b.launchCount || 0) - (a.launchCount || 0))[0]

  const memPct = sys?.memory?.total
    ? (sys.memory.used / sys.memory.total) * 100
    : 0

  const loadPct = sys?.cpus
  ? Math.min(100, Math.pow(sys.load / sys.cpus, 0.7) * 100)
  : 0

  const pressure = cpu * 0.85 + memPct * 0.15
  
  const stats = [
    { icon: <Gamepad2 size={16} />, label: 'Games', value: games.length, color: '#7C6CF2' },
    { icon: <Grid3X3 size={16} />, label: 'Apps', value: apps.length, color: '#38BDF8' },
    { icon: <TrendingUp size={16} />, label: 'Launches', value: totalLaunches, color: '#34D399' },
    { icon: <Activity size={16} />, label: 'Sessions', value: recentLaunches.length, color: '#F472B6' }
  ]

  return (
    <div style={styles.wrapper}>

      <div style={styles.header}>
        <Sparkles size={14} color="#a78bfa" />
        <span style={styles.headerText}>SYSTEM MONITOR (LIVE)</span>
      </div>

      <div style={styles.grid}>
        {stats.map(s => (
          <div key={s.label} style={styles.card}>
            <div style={{ ...styles.icon, color: s.color }}>{s.icon}</div>
            <div>
              <div style={styles.value}>{s.value}</div>
              <div style={styles.label}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {sys && (
        <div style={styles.panel}>

          <Bar label="CPU Usage" value={cpu} color="#7C6CF2" />
          <Bar label="System Pressure" value={pressure} color="#38BDF8" />

          <Bar
            label="RAM Usage"
            value={memPct}
            color="#34D399"
            suffix={`${(sys.memory.total / 1024 ** 3).toFixed(1)} GB`}
          />

          <div style={styles.row}>
            <span>CPU Cores</span>
            <span>{sys.cpus}</span>
          </div>

          <div style={styles.row}>
            <span>Platform</span>
            <span>{sys.platform} ({sys.arch})</span>
          </div>

          <div style={styles.row}>
            <span>Hostname</span>
            <span>{sys.hostname}</span>
          </div>
        </div>
      )}

      {topGame && (
        <div style={styles.panelSoft}>
          <div style={styles.panelTitle}>MOST PLAYED</div>
          <div style={styles.rowBox}>
            <Gamepad2 size={16} />
            <div>
              <div style={styles.gameName}>{topGame.name}</div>
              <div style={styles.gameMeta}>{topGame.launchCount} launches</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- BAR ---------- */
function Bar({ label, value, color, suffix }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={styles.progressTop}>
        <span>{label}</span>
        <span style={{ color: '#E6E9F5' }}>
          {Math.round(value)}% {suffix || ''}
        </span>
      </div>

      <div style={styles.bar}>
        <div
          style={{
            ...styles.barFill,
            width: `${Math.min(100, value)}%`,
            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.35), ${color})`,
            boxShadow: `0 0 ${10 + value * 0.2}px ${color}`
          }}
        />
        <div style={styles.barGlass} />
      </div>
    </div>
  )
}

/* ---------- STYLES ---------- */
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    color: '#e5e7eb',

    background: `
      radial-gradient(circle at 20% 10%, rgba(124,108,242,0.25), transparent 45%),
      radial-gradient(circle at 80% 90%, rgba(56,189,248,0.18), transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(52,211,153,0.08), transparent 60%),
      linear-gradient(160deg, rgba(18,18,26,0.9), rgba(10,10,14,0.95))
    `,

    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.06)'
  },

  header: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },

  headerText: {
    fontSize: 10,
    letterSpacing: '0.3em',
    color: '#c4b5fd'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10
  },

  card: {
    display: 'flex',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)'
  },

  icon: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)'
  },

  value: {
    fontSize: 20,
    fontWeight: 700
  },

  label: {
    fontSize: 11,
    opacity: 0.65
  },

  panel: {
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)'
  },

  panelSoft: {
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)'
  },

  panelTitle: {
    fontSize: 10,
    letterSpacing: '0.25em',
    marginBottom: 10
  },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    padding: '6px 0'
  },

  rowBox: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },

  gameName: {
    fontSize: 13,
    fontWeight: 600
  },

  gameMeta: {
    fontSize: 11,
    opacity: 0.6
  },

  progressTop: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    marginBottom: 4
  },

  bar: {
    height: 6,
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.06)'
  },

  barFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.2s linear'
  },

  barGlass: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent 40%)'
  }
}