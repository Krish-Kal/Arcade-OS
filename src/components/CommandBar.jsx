import React from 'react'
import { Zap } from 'lucide-react'
import GlobalSearchBar from './GlobalSearchBar'

export default function CommandBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '10px 20px',
      background: 'rgba(11, 16, 32, 0.92)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #5b8cff 0%, #8B5CF6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
        }}>
          <Zap size={14} color="#fff" />
        </div>

        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: '#E6E9F5',
        }}>
          ARCADE OS
        </span>
      </div>

      {/* GLOBAL SEARCH */}
      <GlobalSearchBar />
    </div>
  )
}
