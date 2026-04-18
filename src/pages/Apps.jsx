// Apps Page - Ultra Premium Library (PERFECT MATCH WITH GAMES)

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, Grid3X3, List, LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { useStore } from '../store/useStore'
import AppCard from '../components/AppCard'
import AddAppModal from '../components/AddAppModal'

const CATEGORIES = ['All', 'Dev Tools', 'Communication', 'Streaming', 'Media', 'Productivity', 'Browser', 'Utilities', 'Design', 'Other']

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'launches', label: 'Most Used' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'pinned', label: 'Pinned First' },
]

export default function Apps() {
  const { apps } = useStore()

  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  /* ✅ RESTORE FROM localStorage */
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState(() => localStorage.getItem('apps_category') || 'All')
  const [sort, setSort] = useState(() => localStorage.getItem('apps_sort') || 'launches')
  const [view, setView] = useState(() => localStorage.getItem('apps_view') || 'grid')

  const [showFilters, setShowFilters] = useState(false)

  const [openSort, setOpenSort] = useState(false)
  const sortRef = useRef(null)

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
      if (a.pinned !== b.pinned) {
        return b.pinned ? 1 : -1
      }

      switch (sort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')

        case 'launches':
          return (b.launchCount || 0) - (a.launchCount || 0)

        case 'recent':
          return (b.addedAt || 0) - (a.addedAt || 0)

        case 'pinned':
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)

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

      {/* 🔥 FLOATING COMMAND BAR (IDENTICAL TO GAMES) */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        backdropFilter: 'blur(16px)',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        zIndex: 10
      }}>

        {/* TITLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #5b8cff, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(139,92,246,0.4)'
          }}>
            <LayoutGrid size={18} color="#fff" />
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              letterSpacing: '0.12em'
            }}>
              APPS LIBRARY
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {apps.length} apps available
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{
          position: 'relative',
          flex: 1,
          minWidth: 200,
          maxWidth: 300
        }}>
          <Search size={14} style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your apps..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: 12,
              border: '1px solid var(--border-dim)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'all 0.25s ease'
            }}
          />
        </div>

        {/* ✅ SORT (UNCHANGED UI) */}
        <div ref={sortRef} style={{ position: 'relative', minWidth: 160 }}>
          <div
            onClick={() => setOpenSort(o => !o)}
            style={{
              padding: '9px 12px',
              borderRadius: 12,
              border: '1px solid var(--border-dim)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.25s ease'
            }}
          >
            {SORTS.find(s => s.value === sort)?.label}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
          </div>

          {openSort && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              width: '100%',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid var(--border-dim)',
              background: 'linear-gradient(145deg, rgba(20,20,30,0.95), rgba(15,15,25,0.95))',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              zIndex: 50
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
                    fontSize: 12,
                    cursor: 'pointer',
                    color: sort === s.value ? '#c4b5fd' : 'var(--text-secondary)',
                    background: sort === s.value
                      ? 'linear-gradient(135deg, #5b8cff22, #8b5cf622)'
                      : 'transparent'
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
            padding: '9px 12px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--border-dim)',
            background: showFilters
              ? 'linear-gradient(135deg, #5b8cff22, #8b5cf622)'
              : 'rgba(255,255,255,0.03)',
            color: showFilters ? '#c4b5fd' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <SlidersHorizontal size={14} /> Filters
        </button>

        {/* VIEW */}
        <div style={{
          display: 'flex',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--border-dim)'
        }}>
          {[{ v: 'grid', icon: <Grid3X3 size={14} /> }, { v: 'list', icon: <List size={14} /> }].map(({ v, icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '8px 10px',
                border: 'none',
                cursor: 'pointer',
                background: view === v
                  ? 'linear-gradient(135deg, #5b8cff33, #8b5cf633)'
                  : 'transparent',
                color: view === v ? '#c4b5fd' : 'var(--text-muted)'
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #5b8cff, #8b5cf6)',
            border: 'none',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(139,92,246,0.5)'
          }}
        >
          <Plus size={14} /> Add App
        </button>
      </div>

      {/* FILTER PILLS (UNCHANGED) */}
      {showFilters && (
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: '1px solid var(--border-dim)',
                background: category === c
                  ? 'linear-gradient(135deg, #5b8cff22, #8b5cf622)'
                  : 'rgba(255,255,255,0.02)',
                color: category === c ? '#c4b5fd' : 'var(--text-secondary)'
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            {filtered.map(app => <AppCard key={app.id} app={app} view="grid" />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(app => <AppCard key={app.id} app={app} view="list" />)}
          </div>
        )}
      </div>

      {showModal && <AddAppModal onClose={() => setShowModal(false)} />}
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