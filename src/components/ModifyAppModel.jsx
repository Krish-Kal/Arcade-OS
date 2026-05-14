import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  FolderOpen,
  AppWindow,
  Upload,
  Link2
} from 'lucide-react'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

const CATEGORIES = [
  'Productivity',
  'Dev Tools',
  'Media',
  'Browser',
  'Communication',
  'Streaming',
  'Utilities',
  'Design',
  'AI Tools',
  'Other'
]

export default function ModifyAppModal({ app, onClose, updateApp }) {

  const [form, setForm] = useState({
    name: app.name || '',
    path: app.path || '',
    image: app.image || '',
    category: app.category || 'Productivity'
  })

  const [errors, setErrors] = useState({})

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ================= FILE PICKERS ================= */

  const browsePath = async () => {
    if (!isElectron) {
      update('path', 'C:\\Program Files\\MyApp\\app.exe')
      return
    }

    const p = await window.arcadeOS.fs.selectExecutable()

    if (p) {
      update('path', p)

      if (!form.name) {
        update(
          'name',
          p.split(/[\\/]/).pop().replace(/\.[^.]+$/, '')
        )
      }
    }
  }

  const browseImage = async () => {
    if (!isElectron) return

    const p = await window.arcadeOS.fs.selectImage()

    if (p) {
      update('image', `file://${p}`)
    }
  }

  /* ================= VALIDATION ================= */

  const validate = () => {
    const e = {}

    if (!form.name.trim()) {
      e.name = 'App name is required'
    }

    if (!form.path.trim()) {
      e.path = 'Launch path is required'
    }

    setErrors(e)

    return Object.keys(e).length === 0
  }

  /* ================= SAVE ================= */

  const submit = () => {
    if (!validate()) return

    updateApp(app.id, {
      name: form.name.trim(),
      path: form.path.trim(),
      image: form.image || null,
      category: form.category
    })

    onClose()
  }

  return createPortal(
    <Overlay onClose={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 500,
          maxWidth: '92vw',
          borderRadius: 18,
          background: `
            linear-gradient(
              180deg,
              rgba(255,255,255,0.05),
              rgba(255,255,255,0.02)
            )
          `,
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(22px)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          animation: 'popIn 0.25s ease'
        }}
      >

        {/* HEADER */}
        <div
          style={{
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >

            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AppWindow size={16} color="#a78bfa" />
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#e5e7eb',
                  letterSpacing: '0.06em'
                }}
              >
                MODIFY APP
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: '#9ca3af'
                }}
              >
                Edit launcher + application metadata
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
        <div
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >

          {/* APP NAME */}
          <Field label="App Name" error={errors.name}>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Visual Studio Code"
              style={inputStyle(errors.name)}
            />
          </Field>

          {/* PATH */}
          <Field label="Launch Path" error={errors.path}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.path}
                onChange={e => update('path', e.target.value)}
                placeholder="exe, steam://, https:// ..."
                style={{
                  ...inputStyle(errors.path),
                  flex: 1
                }}
              />

              <IconButton onClick={browsePath}>
                <FolderOpen size={14} />
              </IconButton>
            </div>
          </Field>

          {/* CATEGORY */}
          <Field label="Category">
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              style={selectStyle}
            >
              {CATEGORIES.map(c => (
                <option
                  key={c}
                  value={c}
                  style={{ background: '#0f0f15' }}
                >
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {/* IMAGE */}
          <Field label="App Icon / Banner">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.image}
                onChange={e => update('image', e.target.value)}
                placeholder="Image URL or local image path"
                style={{
                  ...inputStyle(),
                  flex: 1
                }}
              />

              <IconButton onClick={browseImage}>
                <Upload size={14} />
              </IconButton>
            </div>

            {form.image && (
              <div
                style={{
                  marginTop: 10,
                  height: 85,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
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

        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <button
            onClick={onClose}
            style={secondaryBtn}
          >
            Cancel
          </button>

          <button
            onClick={submit}
            style={primaryBtn}
          >
            Save Changes
          </button>
        </div>

      </div>
    </Overlay>,
    document.body
  )
}

/* ================= SHARED COMPONENTS ================= */

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
        zIndex: 2000,
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
      <label
        style={{
          fontSize: 11,
          color: '#9ca3af',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
          display: 'block'
        }}
      >
        {label}
      </label>

      {children}

      {error && (
        <div
          style={{
            fontSize: 11,
            color: '#ef4444',
            marginTop: 4
          }}
        >
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
        background: hover
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.04)',
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

/* ================= STYLES ================= */

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

const inputStyle = (error) => ({
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${
    error
      ? '#ef4444'
      : 'rgba(255,255,255,0.08)'
  }`,
  borderRadius: 10,
  color: '#e5e7eb',
  fontSize: 13,
  outline: 'none'
})

const primaryBtn = {
  padding: '10px 18px',
  borderRadius: 10,
  background: '#8b5cf6',
  border: 'none',
  color: '#fff',
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

/* ================= ANIMATION ================= */

const style = document.createElement('style')

style.innerHTML = `
@keyframes popIn {
  from {
    transform: scale(0.96);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
`

document.head.appendChild(style)