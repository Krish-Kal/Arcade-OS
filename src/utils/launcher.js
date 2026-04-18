const EXECUTABLE_EXTENSIONS = ['exe', 'app', 'sh', 'bat', 'cmd', 'lnk', 'msi']

export async function launchExecutable(path) {
  const isElectron =
    typeof window !== 'undefined' && window.arcadeOS

  if (!isElectron) {
    console.log('[Demo] Would launch:', path)
    return { success: true, demo: true }
  }

  const result = await window.arcadeOS.launch.open(path)

  if (!result?.success) {
    console.error('Launch failed:', result?.error)
  }

  return result
}

export function getFileExtension(path) {
  return path?.split('.').pop()?.toLowerCase() || ''
}

export function isExecutable(path) {
  if (!path) return false
  const ext = getFileExtension(path)
  return EXECUTABLE_EXTENSIONS.includes(ext)
}

export function formatLaunchCount(count) {
  if (!count) return 'Never played'
  if (count === 1) return '1 launch'
  if (count < 100) return `${count} launches`
  return `${count}+ launches`
}

export function getTimeSince(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}