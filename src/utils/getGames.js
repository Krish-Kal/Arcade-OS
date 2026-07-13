export function filterGames(games, { search = '', genre = 'All' } = {}) {
  return games.filter(g => {
    const matchSearch =
      !search ||
      (g.name && g.name.toLowerCase().includes(search.toLowerCase()))

    const matchGenre =
      genre === 'All' ||
      (g.genre && g.genre.toLowerCase() === genre.toLowerCase())

    return matchSearch && matchGenre
  })
}

export function sortGames(games, sortBy = 'launches') {
  const list = [...games]

  switch (sortBy) {
    case 'name':
      return list.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      )

    case 'launches':
      return list.sort(
        (a, b) => (b.launchCount || 0) - (a.launchCount || 0)
      )

    case 'recent':
      return list.sort(
        (a, b) =>
          new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
      )

    default:
      return list
  }
}

export function getUniqueGenres(games) {
  return ['All', ...new Set(games.map(g => g.genre).filter(Boolean))]
}

export function getTotalPlaytime(games) {
  return games.reduce((s, g) => s + (g.playtimeMinutes || 0), 0)
}
