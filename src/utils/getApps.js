// utils/getApps.js - App library utilities

export function filterApps(apps, { search = '', category = 'All' } = {}) {
  return apps.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || a.category === category
    return matchSearch && matchCat
  })
}

export function sortApps(apps, sortBy = 'launches') {
  const list = [...apps]
  switch (sortBy) {
    case 'name': return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'launches': return list.sort((a, b) => b.launchCount - a.launchCount)
    case 'recent': return list.sort((a, b) => b.addedAt - a.addedAt)
    default: return list
  }
}

export function getUniqueCategories(apps) {
  return ['All', ...new Set(apps.map(a => a.category).filter(Boolean))]
}
