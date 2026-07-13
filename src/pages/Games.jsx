// Games Page - Ultra Luxury Experience (FINAL - SORT DROPDOWN FIXED ONLY)

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react'
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
]

export default function Games() {
  const games = useStore(state => state.games)
  const updateGame = useStore(state => state.updateGame)

  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState(() => localStorage.getItem('gameGenre') || 'All')
  const [sort, setSort] = useState(() => localStorage.getItem('gameSort') || 'launches')
  const [view, setView] = useState(() => localStorage.getItem('gameView') || 'grid')
  const [showFilters, setShowFilters] = useState(false)

  const [openSort, setOpenSort] = useState(false)
  const sortRef = useRef(null)
  const openEditGame = useCallback((game) => setEditingGame(game), [])

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
<div
  style={{
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
        rgba(16,18,30,0.58),
        rgba(12,14,24,0.42)
      )
    `,

    borderBottom: '1px solid rgba(255,255,255,0.05)',

    boxShadow: `
      0 10px 45px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.05)
    `,

    zIndex: 20
  }}
>

  {/* PREMIUM AMBIENT GLOWS */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}
  >
    <div
      style={{
        position: 'absolute',
        width: 240,
        height: 240,
        top: -120,
        left: -60,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(91,140,255,0.22), transparent 70%)',
        filter: 'blur(22px)'
      }}
    />

    <div
      style={{
        position: 'absolute',
        width: 260,
        height: 260,
        top: -140,
        right: -80,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(139,92,246,0.20), transparent 70%)',
        filter: 'blur(24px)'
      }}
    />

    <div
      style={{
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
      }}
    />
  </div>

  {/* TITLE */}
  <div
    style={{
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      paddingRight: 2
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 12,

        background: `
          linear-gradient(
            135deg,
            rgba(91,140,255,0.95),
            rgba(139,92,246,0.95)
          )
        `,

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        boxShadow: `
          0 10px 24px rgba(91,140,255,0.25),
          0 0 30px rgba(139,92,246,0.20),
          inset 0 1px 0 rgba(255,255,255,0.25)
        `
      }}
    >
      <Gamepad2 size={15} color="#fff" />
    </div>

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',

          background:
            'linear-gradient(90deg, #ffffff, #d7c4ff)',

          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        GAME LIBRARY
      </div>

      <div
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.42)',
          fontWeight: 500
        }}
      >
        {games.length} games available
      </div>
    </div>
  </div>

  {/* SEARCH */}
  <div
    style={{
      position: 'relative',
      flex: 1,
      minWidth: 190,
      maxWidth: 280,
      zIndex: 1
    }}
  >
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
      placeholder="Search your games..."
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

  {/* SORT DROPDOWN */}
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

      <span
        style={{
          fontSize: 9,
          color: '#c4b5fd'
        }}
      >
        ▼
      </span>
    </div>

    {openSort && (
      <div
        style={{
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
        }}
      >
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
  <div
    style={{
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
    }}
  >
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
    Add Game
  </button>
</div>

{/* FILTER PILLS */}
{showFilters && (
  <div
    style={{
      position: 'relative',

      padding: '8px 18px 10px',

      display: 'flex',
      alignItems: 'center',
      gap: 7,

      overflowX: 'auto',
      overflowY: 'hidden',

      backdropFilter: 'blur(14px) saturate(150%)',
      WebkitBackdropFilter: 'blur(14px) saturate(150%)',

      background: `
        linear-gradient(
          180deg,
          rgba(18,20,34,0.36),
          rgba(12,14,24,0.18)
        )
      `,

      borderBottom: '1px solid rgba(255,255,255,0.04)',

      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.025)
      `,

      scrollbarWidth: 'none',

      zIndex: 5
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          top: -120,
          left: -60,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(91,140,255,0.10), transparent 72%)',
          filter: 'blur(20px)'
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          top: -140,
          right: -70,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.08), transparent 72%)',
          filter: 'blur(22px)'
        }}
      />
    </div>

    {GENRES.map(g => {
      const active = genre === g

      return (
        <button
          key={g}
          onClick={() => setGenre(g)}
          style={{
            position: 'relative',
            zIndex: 2,

            height: 30,
            padding: '0 13px',

            borderRadius: 999,

            whiteSpace: 'nowrap',

            cursor: 'pointer',

            border: active
              ? '1px solid rgba(139,92,246,0.22)'
              : '1px solid rgba(255,255,255,0.045)',

            background: active
              ? `
                linear-gradient(
                  135deg,
                  rgba(91,140,255,0.14),
                  rgba(139,92,246,0.16)
                )
              `
              : `
                linear-gradient(
                  135deg,
                  rgba(255,255,255,0.04),
                  rgba(255,255,255,0.012)
                )
              `,

            color: active
              ? '#e2d6ff'
              : 'rgba(255,255,255,0.64)',

            fontSize: 10.5,
            fontWeight: active ? 600 : 500,

            letterSpacing: '0.02em',

            backdropFilter: 'blur(14px)',

            transition: 'all 0.22s ease',

            boxShadow: active
              ? `
                0 4px 16px rgba(139,92,246,0.12),
                inset 0 1px 0 rgba(255,255,255,0.07)
              `
              : `
                inset 0 1px 0 rgba(255,255,255,0.035)
              `,

            flexShrink: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'

            if (!active) {
              e.currentTarget.style.border =
                '1px solid rgba(255,255,255,0.09)'

              e.currentTarget.style.background =
                'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0px)'

            if (!active) {
              e.currentTarget.style.border =
                '1px solid rgba(255,255,255,0.045)'

              e.currentTarget.style.background =
                'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))'
            }
          }}
        >
          {g}
        </button>
      )
    })}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 165px))',
justifyContent: 'start',
gap: 12
          }}>
            {filtered.map(game => (
              <GameCard
                key={game.id}
                game={game}
                view="grid"
                onEdit={openEditGame}
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
                onEdit={openEditGame}
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
