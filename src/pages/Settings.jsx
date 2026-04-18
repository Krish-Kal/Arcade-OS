import React, { useState } from 'react'
import { Settings, Palette, Layout, Trash2, RotateCcw, Monitor, Zap, Info } from 'lucide-react'
import { useStore } from '../store/useStore'

const ACCENT_COLORS = [
  { id: 'cyan', label: 'Cyan', hex: '#00d4ff' },
  { id: 'purple', label: 'Purple', hex: '#7c3aed' },
  { id: 'pink', label: 'Pink', hex: '#ec4899' },
  { id: 'green', label: 'Green', hex: '#10b981' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
]

export default function SettingsPage() {
  const store = useStore()

  const settings = store.settings || {
    accentColor: 'cyan',
    layout: 'grid',
    showFPS: false,
    animations: true,
    scanlines: true,
  }

  const updateSettings = store.updateSettings || (() => {})
  const games = store.games || []
  const apps = store.apps || []
  const clearLibrary = store.clearLibrary || (() => {})

  const [confirmReset, setConfirmReset] = useState(false)

  const resetLibrary = () => {
    if (confirmReset) {
      clearLibrary()
      setConfirmReset(false)
    } else {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, padding: '28px 28px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Settings size={20} color="var(--accent-main)" />
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.08em'
          }}>
            SETTINGS
          </h1>
        </div>

        {/* Appearance */}
        <Section icon={<Palette size={14} />} title="Appearance">

          <SettingRow label="Accent Color" description="Primary highlight color">
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => updateSettings({ accentColor: c.id })}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: c.hex,
                    border: settings.accentColor === c.id ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: settings.accentColor === c.id ? `0 0 12px ${c.hex}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Animations" description="Enable smooth UI motion">
            <Toggle value={settings.animations} onChange={v => updateSettings({ animations: v })} />
          </SettingRow>

          <SettingRow label="Scanlines" description="Retro CRT overlay">
            <Toggle value={settings.scanlines} onChange={v => updateSettings({ scanlines: v })} />
          </SettingRow>

        </Section>

        {/* Layout */}
        <Section icon={<Layout size={14} />} title="Layout">
          <SettingRow label="Default View" description="Library layout style">
            <div style={{
              display: 'flex',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border-dim)',
              background: 'var(--bg-elevated)'
            }}>
              {['grid', 'list'].map(v => (
                <button
                  key={v}
                  onClick={() => updateSettings({ layout: v })}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    cursor: 'pointer',
                    background: settings.layout === v ? 'var(--bg-hover)' : 'transparent',
                    color: settings.layout === v ? 'var(--accent-main)' : 'var(--text-secondary)',
                    fontSize: 12,
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </SettingRow>
        </Section>

        {/* Display */}
        <Section icon={<Monitor size={14} />} title="Display">
          <SettingRow label="FPS Counter" description="Show performance overlay">
            <Toggle value={settings.showFPS} onChange={v => updateSettings({ showFPS: v })} />
          </SettingRow>
        </Section>

        {/* Library */}
        <Section icon={<Zap size={14} />} title="Library">

          <SettingRow label="Library Stats">
            <div style={{ display: 'flex', gap: 20 }}>
              <Stat label="Games" value={games.length} />
              <Stat label="Apps" value={apps.length} />
              <Stat label="Total" value={games.length + apps.length} />
            </div>
          </SettingRow>

          <SettingRow label="Clear Library">
            <button
              onClick={resetLibrary}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: confirmReset ? '#ef444420' : 'transparent',
                border: `1px solid ${confirmReset ? '#ef4444' : 'var(--border-normal)'}`,
                color: confirmReset ? '#ef4444' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {confirmReset
                ? <><RotateCcw size={14} /> Confirm</>
                : <><Trash2 size={14} /> Clear All</>}
            </button>
          </SettingRow>

        </Section>

        {/* About */}
        <Section icon={<Info size={14} />} title="About">
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #020617)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 18,
            boxShadow: '0 0 20px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--accent-main), #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>ARCADE OS</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Version 1.0.0</div>
              </div>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}

// ---------- COMPONENTS ----------

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        paddingBottom: 6,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <span style={{ color: 'var(--accent-main)', opacity: 0.8 }}>{icon}</span>
        <span style={{
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)'
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 46,
        height: 24,
        borderRadius: 999,
        background: value ? 'var(--accent-main)' : 'var(--bg-elevated)',
        border: `1px solid ${value ? 'var(--accent-main)' : 'var(--border-normal)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: value ? 24 : 2,
        width: 18,
        height: 18,
        borderRadius: 999,
        background: value ? '#000' : 'var(--text-muted)',
        transition: 'all 0.25s',
        boxShadow: value ? '0 0 8px var(--accent-main)' : 'none'
      }} />
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--accent-main)',
        fontFamily: 'var(--font-display)'
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  )
}