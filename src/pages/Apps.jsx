// Apps Page - Ultra Premium Library (PERFECT MATCH WITH GAMES)

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, Grid3X3, List, LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { useStore } from '../store/useStore'
import AppCard from '../components/AppCard'
import AddAppModal from '../components/AddAppModal'
import ModifyAppModal from '../components/ModifyAppModel'

const CATEGORIES = ['All', 'Dev Tools', 'Communication', 'Streaming', 'Media', 'Productivity', 'Browser', 'Utilities', 'Design', 'Other']

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'launches', label: 'Most Used' },
  { value: 'recent', label: 'Recently Added' },
]

export default function Apps() {
  const apps = useStore(state => state.apps)
  const updateApp = useStore(state => state.updateApp)

  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
const [selectedApp, setSelectedApp] = useState(null)
  /* ✅ RESTORE FROM localStorage */
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState(() => localStorage.getItem('apps_category') || 'All')
  const [sort, setSort] = useState(() => localStorage.getItem('apps_sort') || 'launches')
  const [view, setView] = useState(() => localStorage.getItem('apps_view') || 'grid')

  const [showFilters, setShowFilters] = useState(false)

  const [openSort, setOpenSort] = useState(false)
  const sortRef = useRef(null)
  const openModifyApp = useCallback((app) => setSelectedApp(app), [])

  /* 🔥 SAVE TO localStorage */
  useEffect(() => {
    localStorage.setItem('apps_category', category)
  }, [category])

  useEffect(() => {
    localStorage.setItem('apps_sort', sort)
  }, [sort])

  useEffect(() => {
    localStorage.setItem('apps_view', view)
  }, [view])

  /* 🔥 Debounce (UNCHANGED) */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  /* 🔥 Click outside + ESC (UNCHANGED) */
  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setOpenSort(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpenSort(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  /* 🔥 FILTERING (UNCHANGED) */
  const filtered = useMemo(() => {
    let list = [...(apps || [])]

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(a =>
        (a.name || '').toLowerCase().includes(q)
      )
    }

    if (category !== 'All') {
      list = list.filter(
        a => (a.category || '').toLowerCase() === category.toLowerCase()
      )
    }

    list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')

        case 'launches':
          return (b.launchCount || 0) - (a.launchCount || 0)

        case 'recent':
          return (b.addedAt || 0) - (a.addedAt || 0)

        default:
          return 0
      }
    })

    return list
  }, [apps, debouncedSearch, category, sort])

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'radial-gradient(circle at top left, rgba(139,92,246,0.1), transparent 45%)'
    }}>

      {/* EVERYTHING BELOW UNTOUCHED */}

{/* 🔥 FLOATING COMMAND BAR (ULTRA PREMIUM GLASS) */}
<div style={{
  position: 'relative',
  padding: '12px 18px',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  overflow: 'visible',

  backdropFilter: 'blur(20px) saturate(150%)',
  WebkitBackdropFilter: 'blur(20px) saturate(150%)',

  background: `
    linear-gradient(
      135deg,
      rgba(18,20,34,0.62),
      rgba(10,12,22,0.48)
    )
  `,

  borderBottom: '1px solid rgba(255,255,255,0.05)',

  boxShadow: `
    0 10px 45px rgba(0,0,0,0.45),
    inset 0 1px 0 rgba(255,255,255,0.06)
  `,

  zIndex: 20
}}>

  {/* PREMIUM AMBIENT GLOWS */}
  <div style={{
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none'
  }}>
    <div style={{
      position: 'absolute',
      width: 260,
      height: 260,
      top: -130,
      left: -70,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(91,140,255,0.22), transparent 72%)',
      filter: 'blur(24px)'
    }} />

    <div style={{
      position: 'absolute',
      width: 280,
      height: 280,
      top: -150,
      right: -80,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(139,92,246,0.20), transparent 72%)',
      filter: 'blur(24px)'
    }} />

    <div style={{
      position: 'absolute',
      inset: 0,
      background: `
        linear-gradient(
          90deg,
          transparent,
          rgba(255,255,255,0.025),
          transparent
        )
      `
    }} />
  </div>

  {/* TITLE */}
  <div style={{
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 11
  }}>
    <div style={{
      width: 34,
      height: 34,
      borderRadius: 13,

      background: `
        linear-gradient(
          135deg,
          rgba(91,140,255,0.96),
          rgba(139,92,246,0.96)
        )
      `,

      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',

      boxShadow: `
        0 10px 28px rgba(91,140,255,0.25),
        0 0 34px rgba(139,92,246,0.18),
        inset 0 1px 0 rgba(255,255,255,0.22)
      `
    }}>
      <LayoutGrid size={16} color="#fff" />
    </div>

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',

        background:
          'linear-gradient(90deg, #ffffff, #d7c4ff)',

        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        APPS LIBRARY
      </div>

      <div style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.42)'
      }}>
        {apps.length} apps available
      </div>
    </div>
  </div>

  {/* SEARCH */}
  <div style={{
    position: 'relative',
    flex: 1,
    minWidth: 190,
    maxWidth: 280,
    zIndex: 1
  }}>
    <Search
      size={13}
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.36)',
        pointerEvents: 'none'
      }}
    />

    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search your apps..."
      style={{
        width: '100%',
        height: 38,
        padding: '0 14px 0 34px',
        borderRadius: 13,

        border: '1px solid rgba(255,255,255,0.06)',

        background: `
          linear-gradient(
            135deg,
            rgba(255,255,255,0.055),
            rgba(255,255,255,0.02)
          )
        `,

        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        fontWeight: 500,

        outline: 'none',

        transition: 'all 0.22s ease',

        backdropFilter: 'blur(16px)',

        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 4px 18px rgba(0,0,0,0.18)
        `
      }}
      onFocus={e => {
        e.target.style.border =
          '1px solid rgba(139,92,246,0.28)'

        e.target.style.boxShadow =
          '0 0 0 4px rgba(139,92,246,0.08)'
      }}
      onBlur={e => {
        e.target.style.border =
          '1px solid rgba(255,255,255,0.06)'

        e.target.style.boxShadow =
          'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 18px rgba(0,0,0,0.18)'
      }}
    />
  </div>

  {/* SORT */}
  <div
    ref={sortRef}
    style={{
      position: 'relative',
      minWidth: 150,
      zIndex: 100
    }}
  >
    <div
      onClick={() => setOpenSort(o => !o)}
      style={{
        height: 38,
        padding: '0 13px',
        borderRadius: 13,

        border: '1px solid rgba(255,255,255,0.06)',

        background: `
          linear-gradient(
            135deg,
            rgba(255,255,255,0.05),
            rgba(255,255,255,0.02)
          )
        `,

        color: 'rgba(255,255,255,0.82)',
        fontSize: 11.5,
        fontWeight: 500,

        cursor: 'pointer',

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',

        backdropFilter: 'blur(16px)',

        transition: 'all 0.22s ease',

        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 4px 18px rgba(0,0,0,0.18)
        `
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.border =
          '1px solid rgba(139,92,246,0.22)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0px)'
        e.currentTarget.style.border =
          '1px solid rgba(255,255,255,0.06)'
      }}
    >
      {SORTS.find(s => s.value === sort)?.label}

      <span style={{
        fontSize: 9,
        color: '#c4b5fd'
      }}>
        ▼
      </span>
    </div>

    {openSort && (
      <div style={{
        position: 'absolute',
        top: '115%',
        left: 0,
        width: '100%',

        borderRadius: 16,
        overflow: 'hidden',

        border: '1px solid rgba(255,255,255,0.06)',

        background: `
          linear-gradient(
            180deg,
            rgba(20,22,36,0.94),
            rgba(10,12,22,0.94)
          )
        `,

        backdropFilter: 'blur(28px)',

        boxShadow: `
          0 18px 50px rgba(0,0,0,0.55),
          0 0 30px rgba(139,92,246,0.08)
        `,

        zIndex: 999
      }}>
        {SORTS.map(s => (
          <div
            key={s.value}
            onClick={() => {
              setSort(s.value)
              setOpenSort(false)
            }}
            style={{
              padding: '10px 14px',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',

              color:
                sort === s.value
                  ? '#e2d6ff'
                  : 'rgba(255,255,255,0.74)',

              background:
                sort === s.value
                  ? 'linear-gradient(90deg, rgba(91,140,255,0.12), rgba(139,92,246,0.14))'
                  : 'transparent',

              transition: 'all 0.18s ease'
            }}
            onMouseEnter={e => {
              if (sort !== s.value) {
                e.currentTarget.style.background =
                  'rgba(255,255,255,0.045)'
              }
            }}
            onMouseLeave={e => {
              if (sort !== s.value) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
    )}
  </div>

  {/* FILTER BUTTON */}
  <button
    onClick={() => setShowFilters(f => !f)}
    style={{
      position: 'relative',
      zIndex: 1,

      height: 38,
      padding: '0 13px',
      borderRadius: 13,

      display: 'flex',
      alignItems: 'center',
      gap: 6,

      border: '1px solid rgba(255,255,255,0.06)',

      background: showFilters
        ? 'linear-gradient(135deg, rgba(91,140,255,0.14), rgba(139,92,246,0.14))'
        : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',

      color: showFilters
        ? '#d9cbff'
        : 'rgba(255,255,255,0.6)',

      cursor: 'pointer',

      fontSize: 11.5,
      fontWeight: 500,

      backdropFilter: 'blur(16px)',

      transition: 'all 0.22s ease',

      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.05),
        0 4px 18px rgba(0,0,0,0.18)
      `
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-1px)'
      e.currentTarget.style.border =
        '1px solid rgba(139,92,246,0.22)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0px)'
      e.currentTarget.style.border =
        '1px solid rgba(255,255,255,0.06)'
    }}
  >
    <SlidersHorizontal size={13} />
    Filters
  </button>

  {/* VIEW */}
  <div style={{
    position: 'relative',
    zIndex: 1,

    display: 'flex',

    borderRadius: 13,
    overflow: 'hidden',

    border: '1px solid rgba(255,255,255,0.06)',

    background: `
      linear-gradient(
        135deg,
        rgba(255,255,255,0.05),
        rgba(255,255,255,0.02)
      )
    `,

    backdropFilter: 'blur(16px)',

    height: 38,

    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.05),
      0 4px 18px rgba(0,0,0,0.18)
    `
  }}>
    {[
      { v: 'grid', icon: <Grid3X3 size={13} /> },
      { v: 'list', icon: <List size={13} /> }
    ].map(({ v, icon }) => (
      <button
        key={v}
        onClick={() => setView(v)}
        style={{
          width: 40,
          border: 'none',
          cursor: 'pointer',

          background:
            view === v
              ? 'linear-gradient(135deg, rgba(91,140,255,0.16), rgba(139,92,246,0.16))'
              : 'transparent',

          color:
            view === v
              ? '#d9cbff'
              : 'rgba(255,255,255,0.5)',

          transition: 'all 0.22s ease'
        }}
      >
        {icon}
      </button>
    ))}
  </div>

  {/* ADD */}
  <button
    onClick={() => setShowModal(true)}
    style={{
      position: 'relative',
      zIndex: 1,

      display: 'flex',
      alignItems: 'center',
      gap: 6,

      height: 38,
      padding: '0 15px',

      borderRadius: 13,

      background: `
        linear-gradient(
          135deg,
          #5b8cff,
          #8b5cf6
        )
      `,

      border: '1px solid rgba(255,255,255,0.08)',

      color: '#fff',
      fontWeight: 600,
      fontSize: 11.5,

      cursor: 'pointer',

      boxShadow: `
        0 10px 28px rgba(91,140,255,0.24),
        0 0 28px rgba(139,92,246,0.14),
        inset 0 1px 0 rgba(255,255,255,0.18)
      `,

      transition: 'all 0.22s ease'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform =
        'translateY(-1px) scale(1.01)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform =
        'translateY(0px) scale(1)'
    }}
  >
    <Plus size={13} />
    Add App
  </button>
</div>

{/* 🔥 PREMIUM FILTER PILLS */}
{showFilters && (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,

    padding: '10px 16px 12px',

    overflowX: 'auto',
    overflowY: 'hidden',

    background: `
      linear-gradient(
        180deg,
        rgba(255,255,255,0.025),
        rgba(255,255,255,0.01)
      )
    `,

    backdropFilter: 'blur(14px)',

    borderBottom: '1px solid rgba(255,255,255,0.04)',

    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
  }}>
    {CATEGORIES.map(c => (
      <button
        key={c}
        onClick={() => setCategory(c)}
        style={{
          height: 31,
          padding: '0 14px',

          borderRadius: 999,

          whiteSpace: 'nowrap',

          cursor: 'pointer',

          border:
            category === c
              ? '1px solid rgba(139,92,246,0.20)'
              : '1px solid rgba(255,255,255,0.05)',

          background:
            category === c
              ? `
                linear-gradient(
                  135deg,
                  rgba(91,140,255,0.16),
                  rgba(139,92,246,0.18)
                )
              `
              : `
                linear-gradient(
                  135deg,
                  rgba(255,255,255,0.045),
                  rgba(255,255,255,0.015)
                )
              `,

          color:
            category === c
              ? '#e2d6ff'
              : 'rgba(255,255,255,0.62)',

          fontSize: 11,
          fontWeight: 500,

          backdropFilter: 'blur(14px)',

          boxShadow:
            category === c
              ? `
                0 4px 18px rgba(139,92,246,0.14),
                inset 0 1px 0 rgba(255,255,255,0.06)
              `
              : `
                inset 0 1px 0 rgba(255,255,255,0.04)
              `,

          transition: 'all 0.22s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0px)'
        }}
      >
        {c}
      </button>
    ))}
  </div>
)}

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => setShowModal(true)} />
        ) : view === 'grid' ? (
          <div
  style={{
    display: 'grid',

gridTemplateColumns: 'repeat(auto-fill, 170px)',
    justifyContent: 'start',
    alignItems: 'start',
    gap: 14
  }}
>
            {filtered.map(app => <AppCard key={app.id} app={app} view="grid" onModifyApp={openModifyApp} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(app => <AppCard key={app.id} app={app} view="list" onModifyApp={openModifyApp} />)}
          </div>
        )}
      </div>

      {showModal && <AddAppModal onClose={() => setShowModal(false)} />}

        {selectedApp && (
  <ModifyAppModal
    app={selectedApp}
    onClose={() => setSelectedApp(null)}
    updateApp={updateApp}
  />
)}
    </div>
  )
}
/* EMPTY STATE */

function EmptyState({ search, onAdd }) {
  return (
    <div style={{
      height: 300,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }}>
      <LayoutGrid size={54} strokeWidth={1} color="var(--text-dim)" />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          {search ? `No results for "${search}"` : 'No apps found'}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Add apps to build your workspace
        </div>
      </div>

      {!search && (
        <button
          onClick={onAdd}
          style={{
            marginTop: 10,
            padding: '12px 20px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #5b8cff, #8b5cf6)',
            border: 'none',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 12px 35px rgba(139,92,246,0.5)'
          }}
        >
          Add First App
        </button>
      )}
    </div>
  )
}
