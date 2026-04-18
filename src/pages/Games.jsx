// Games Page - Ultra Luxury Experience (FINAL - SORT DROPDOWN FIXED ONLY)

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, Grid3X3, List, SlidersHorizontal, Gamepad2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import GameCard from '../components/GameCard'
import AddGameModal from '../components/AddGameModal'
import ModifyGameModal from '../components/ModifyGameModel'

const GENRES = ['All', 'Action RPG', 'RPG', 'FPS', 'Strategy', 'Roguelike', 'Metroidvania', 'Platformer', 'Space RPG', 'Other']

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'launches', label: 'Most Played' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'pinned', label: 'Pinned First' },
]

export default function Games() {
  const { games, updateGame } = useStore()

  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState(() => localStorage.getItem('gameGenre') || 'All')
  const [sort, setSort] = useState(() => localStorage.getItem('gameSort') || 'launches')
  const [view, setView] = useState(() => localStorage.getItem('gameView') || 'grid')
  const [showFilters, setShowFilters] = useState(false)

  const [openSort, setOpenSort] = useState(false)
  const sortRef = useRef(null)

  // ✅ Persist preferences
  useEffect(() => {
    localStorage.setItem('gameGenre', genre)
  }, [genre])

  useEffect(() => {
    localStorage.setItem('gameSort', sort)
  }, [sort])

  useEffect(() => {
    localStorage.setItem('gameView', view)
  }, [view])

  // ✅ CLOSE ON OUTSIDE CLICK
  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setOpenSort(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ✅ Debounced search (smooth typing UX)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    let list = [...games]

    if (debouncedSearch) list = list.filter(g => g.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    if (genre !== 'All') list = list.filter(g => g.genre === genre)

    switch (sort) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'launches': list.sort((a, b) => b.launchCount - a.launchCount); break
      case 'recent': list.sort((a, b) => b.addedAt - a.addedAt); break
      case 'pinned': list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); break
    }

    return list
  }, [games, debouncedSearch, genre, sort])

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'radial-gradient(circle at top left, rgba(139,92,246,0.1), transparent 45%)'
    }}>

      {/* FLOATING COMMAND BAR */}
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
            <Gamepad2 size={18} color="#fff" />
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              letterSpacing: '0.12em'
            }}>
              GAME LIBRARY
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {games.length} games available
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
            placeholder="Search your games..."
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

        {/* SORT DROPDOWN */}
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
                  onMouseEnter={e => {
                    if (sort !== s.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    if (sort !== s.value) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FILTER BUTTON */}
        <button onClick={() => setShowFilters(f => !f)} style={{
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
        }}>
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
        <button onClick={() => setShowModal(true)} style={{
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
        }}>
          <Plus size={14} /> Add Game
        </button>
      </div>
      {/* FILTER PILLS */}
      {showFilters && (
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: '1px solid var(--border-dim)',
                background: genre === g
                  ? 'linear-gradient(135deg, #5b8cff22, #8b5cf622)'
                  : 'rgba(255,255,255,0.02)',
                color: genre === g ? '#c4b5fd' : 'var(--text-secondary)'
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20
      }}>
        {filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => setShowModal(true)} />
        ) : view === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 14
          }}>
            {filtered.map(game => (
              <GameCard
                key={game.id}
                game={game}
                view="grid"
                onEdit={(g) => setEditingGame(g)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {filtered.map(game => (
              <GameCard
                key={game.id}
                game={game}
                view="list"
                onEdit={(g) => setEditingGame(g)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && <AddGameModal onClose={() => setShowModal(false)} />}
      {editingGame && (
        <ModifyGameModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          updateGame={updateGame}
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
      <Gamepad2 size={54} strokeWidth={1} color="var(--text-dim)" />

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 16,
          color: 'var(--text-secondary)'
        }}>
          {search ? `No results for "${search}"` : 'No games found'}
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginTop: 4
        }}>
          {search ? 'Try another search term' : 'Add games to start your collection'}
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
          Add First Game
        </button>
      )}
    </div>
  )
}