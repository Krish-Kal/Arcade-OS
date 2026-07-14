// AddGameModal - Premium upgraded version (UI only)
import React, { useState } from 'react'
import { X, FolderOpen, Gamepad2, Upload } from 'lucide-react'
import { useStore } from '../store/useStore'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

const GENRES = [
  'Action RPG', 'RPG', 'FPS', 'Strategy', 'Roguelike',
  'Metroidvania', 'Platformer', 'Racing', 'Sports',
  'Simulation', 'Space RPG', 'Adventure', 'Horror',
  'Puzzle', 'Other'
]

export default function AddGameModal({ onClose }) {
  const { addGame } = useStore()

const [form, setForm] = useState({
    name: '',
    path: '',
    genre: 'Action RPG',
    image: '',
    wallpaper: ''
  })

  const [errors, setErrors] = useState({})

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const browsePath = async () => {
    if (!isElectron) {
      update('path', 'C:\\Games\\MyGame\\game.exe')
      return
    }
    const p = await window.arcadeOS.fs.selectExecutable()
    if (p) {
      update('path', p)
      if (!form.name) {
        update('name', p.split(/[\\/]/).pop().replace(/\.[^.]+$/, ''))
      }
    }
  }

const browseImage = async () => {
    if (!isElectron) return
    const p = await window.arcadeOS.fs.selectImage()
    if (p) update('image', `file://${p}`)
  }

  const browseWallpaper = async () => {
    if (!isElectron) return
    const p = await window.arcadeOS.fs.selectImage()
    if (p) update('wallpaper', `file://${p}`)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Game name is required'
    if (!form.path.trim()) e.path = 'Executable path is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

const submit = () => {
    if (!validate()) return
    addGame({
      name: form.name.trim(),
      path: form.path.trim(),
      genre: form.genre,
      image: form.image || null,
      wallpaper: form.wallpaper || null
    })
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 500,
          maxWidth: '92vw',
          borderRadius: 18,
          background: `
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))
          `,
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(22px)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          animation: 'popIn 0.25s ease'
        }}
      >

        {/* HEADER */}
        <div style={{
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(34,211,238,0.12)',
              border: '1px solid rgba(34,211,238,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gamepad2 size={16} color="#22d3ee" />
            </div>

            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e5e7eb',
                letterSpacing: '0.06em'
              }}>
                ADD NEW GAME
              </div>
              <div style={{
                fontSize: 11,
                color: '#9ca3af'
              }}>
                Add executable + metadata
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>

          {/* NAME */}
          <Field label="Game Name" error={errors.name}>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Cyberpunk 2077"
              style={inputStyle(errors.name)}
            />
          </Field>

          {/* PATH */}
          <Field label="Executable Path" error={errors.path}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.path}
                onChange={e => update('path', e.target.value)}
                placeholder="C:\Games\Game.exe"
                style={{ ...inputStyle(errors.path), flex: 1 }}
              />
              <IconButton onClick={browsePath}>
                <FolderOpen size={14} />
              </IconButton>
            </div>
          </Field>

          {/* GENRE  */}
          <Field label="Genre">
            <select
              value={form.genre}
              onChange={e => update('genre', e.target.value)}
              style={selectStyle}
            >
              {GENRES.map(g => (
                <option key={g} value={g} style={{ background: '#0f0f15' }}>
                  {g}
                </option>
              ))}
            </select>
          </Field>

          {/* IMAGE */}
          <Field label="Game Cover (optional)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.image}
                onChange={e => update('image', e.target.value)}
                placeholder="Image URL or file path"
                style={{ ...inputStyle(), flex: 1 }}
              />

              <IconButton onClick={browseImage}>
                <Upload size={14} />
              </IconButton>
            </div>

           {form.image && (
              <div style={{
                marginTop: 10,
                height: 85,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <img
                  src={form.image}
                  alt="preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.9)'
                  }}
                />
              </div>
            )}
          </Field>

          {/* WALLPAPER (Game Details hero background) */}
          <Field label="Details Wallpaper (optional)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.wallpaper}
                onChange={e => update('wallpaper', e.target.value)}
                placeholder="Image URL or file path — used on the Game Details page"
                style={{ ...inputStyle(), flex: 1 }}
              />

              <IconButton onClick={browseWallpaper}>
                <Upload size={14} />
              </IconButton>
            </div>

            {form.wallpaper && (
              <div style={{
                marginTop: 10,
                height: 110,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <img
                  src={form.wallpaper}
                  alt="wallpaper preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.9)'
                  }}
                />
              </div>
            )}
          </Field>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>

          <button onClick={submit} style={primaryBtn}>
            Add Game
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/* ================= UI COMPONENTS ================= */

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(6px)'
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{
        fontSize: 11,
        color: '#9ca3af',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 6,
        display: 'block'
      }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  )
}

function IconButton({ children, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.08)',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        color: '#e5e7eb',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: '0.2s ease'
      }}
    >
      {children}
    </button>
  )
}

/* =================  GENRE DROPDOWN ================= */

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e5e7eb',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer'
}

/* ================= INPUT ================= */

const inputStyle = (error) => ({
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: 10,
  color: '#e5e7eb',
  fontSize: 13,
  outline: 'none'
})

const primaryBtn = {
  padding: '10px 18px',
  borderRadius: 10,
  background: '#22d3ee',
  border: 'none',
  color: '#000',
  fontWeight: 700,
  cursor: 'pointer'
}

const secondaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#9ca3af',
  cursor: 'pointer'
}

/* ANIMATION */
const style = document.createElement('style')
style.innerHTML = `
@keyframes popIn {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
`
document.head.appendChild(style)