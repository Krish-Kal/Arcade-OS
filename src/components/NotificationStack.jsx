// NotificationStack - Toast notifications
import React from 'react'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { useStore } from '../store/useStore'

const ICONS = {
  success: <CheckCircle size={15} color="#10b981" />,
  error: <XCircle size={15} color="#ef4444" />,
  warning: <AlertCircle size={15} color="#f59e0b" />,
  info: <Info size={15} color="#00d4ff" />,
}

const COLORS = {
  success: '#10b98120',
  error: '#ef444420',
  warning: '#f59e0b20',
  info: '#00d4ff20',
}

export default function NotificationStack() {
  const { notifications } = useStore()
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9998, pointerEvents: 'none',
    }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-elevated)',
          border: `1px solid ${COLORS[n.type] || COLORS.info}`,
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
          maxWidth: 320,
          animation: 'fadeIn 0.2s ease',
          boxShadow: `0 4px 20px ${COLORS[n.type] || COLORS.info}`,
        }}>
          {ICONS[n.type] || ICONS.info}
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
            {n.message}
          </span>
        </div>
      ))}
    </div>
  )
}
