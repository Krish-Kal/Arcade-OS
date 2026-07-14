import React, { useEffect, useState } from 'react'
import { Search, Gamepad2, Grid3X3 } from 'lucide-react'
import { useStore } from '../store/useStore'

const T = {
  textPrimary: '#E6E9F5',
  textMuted: '#9AA3B2',
}

export default function GlobalSearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    searchAll,
    searchResults,
    launchItem,
    setActivePage
  } = useStore()

  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
     searchAll(searchQuery)
    }, 180)

    return () => clearTimeout(t)
  }, [searchQuery, searchAll])

  const handleResultClick = (item) => {
    launchItem(item, item.type)
    if (item.type === 'game') setActivePage('games')
    if (item.type === 'app') setActivePage('apps')
    setSearchQuery('')
  }

  return (
    <div style={{ flex: 1, maxWidth: 520, margin: '0 auto', position: 'relative' }}>

      {/* INPUT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '6px 10px',
      }}>
        <Search size={12} color="#9AA3B2" />

        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search everything in Arcade OS..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: T.textPrimary,
            fontSize: 12,
          }}
        />
      </div>

      {/* DROPDOWN */}
      {focused && searchQuery && (
        <div style={{
          position: 'absolute',
          top: 42,
          left: 0,
          right: 0,
          background: '#0B1020',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          backdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          maxHeight: 320,
          overflowY: 'auto',
          zIndex: 999,
        }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: '#9AA3B2' }}>
              No results found
            </div>
          ) : (
            searchResults.map(item => (
              <div
                key={`${item.id}-${item.type}`}
                onClick={() => handleResultClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) =>
                  e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
                }
                onMouseLeave={(e) =>
                  e.currentTarget.style.background = 'transparent'
                }
              >
                {item.type === 'game'
                  ? <Gamepad2 size={14} color="#8B5CF6" />
                  : <Grid3X3 size={14} color="#60A5FA" />}

                <div style={{ fontSize: 12, color: T.textPrimary }}>
                  {item.name}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
