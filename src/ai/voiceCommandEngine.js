const SITE_ALIASES = {
  youtube: 'https://www.youtube.com',
  'you tube': 'https://www.youtube.com',
  hotstar: 'https://www.hotstar.com',
  cricbuzz: 'https://www.cricbuzz.com',
  'cricket scores': 'https://www.cricbuzz.com/cricket-match/live-scores',
  notebooklm: 'https://notebooklm.google.com',
  'notebook lm': 'https://notebooklm.google.com',
  'notebook l m': 'https://notebooklm.google.com',
  'google notebook lm': 'https://notebooklm.google.com',
  chatgpt: 'https://chatgpt.com',
  'chat gpt': 'https://chatgpt.com',
  gemini: 'https://gemini.google.com',
  'google docs': 'https://docs.google.com',
  'google sheets': 'https://sheets.google.com',
  'google drive': 'https://drive.google.com',
  'google meet': 'https://meet.google.com',
  perplexity: 'https://www.perplexity.ai',
  canva: 'https://www.canva.com',
  figma: 'https://www.figma.com',
  linkedin: 'https://www.linkedin.com',
  reddit: 'https://www.reddit.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  netflix: 'https://www.netflix.com',
  spotify: 'https://open.spotify.com',
  discord: 'https://discord.com/app',
  google: 'https://www.google.com',
}

const APP_FIRST_NAMES = new Set(['discord', 'spotify', 'steam', 'vs code', 'vscode', 'edge', 'microsoft edge', 'ms edge'])

const WAKE_RESPONSE = 'Yes Boss.'

const CREATE_WORDS = ['create', 'make', 'new', 'add', 'generate', 'build', 'set up']
const OPEN_WORDS = ['open', 'launch', 'start', 'show', 'go to', 'take me to', 'bring up']
const FOLDER_WORDS = ['folder', 'directory']
const FILE_WORDS = ['file', 'text file', 'note', 'document']
const POLITE_PREFIX = /^(?:(?:hey|hello)\s+vault\s+|vault\s+)?(?:please\s+)?(?:can you|could you|would you|i want you to|i need you to|kindly|please)?\s*/
const WAKE_ONLY = /^(?:hey\s+vault|hello\s+vault|vault)$/

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\bdown loads\b/g, 'downloads')
    .replace(/\bdown load\b/g, 'download')
    .replace(/\bgoogle crome\b/g, 'google chrome')
    .replace(/\bcrome\b/g, 'chrome')
    .replace(/\bnotebook\s+l\s*m\b/g, 'notebook lm')
    .replace(/\bvolt\b/g, 'vault')
    .replace(/\bvault ai\b/g, 'vault')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCommand(text) {
  return normalize(text)
    .replace(POLITE_PREFIX, '')
    .replace(/\b(for me|for my workspace|right now|now|please)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(text) {
  return String(text || '').replace(/\b\w/g, char => char.toUpperCase())
}

function stripWakePhrase(text) {
  return normalizeCommand(text).replace(/^(?:(?:hey|hello)\s+vault|vault)\b/, '').trim()
}

function stripLeadWords(text) {
  return normalizeCommand(text).replace(/^(open|launch|start|play|show|go to|take me to|bring up)\s+/, '').trim()
}

function stripBrowserWords(text) {
  return normalize(text)
    .replace(/\b(in|on)\s+(google\s+)?chrome\b/g, '')
    .replace(/\b(in|on)\s+(microsoft\s+|ms\s+)?edge\b/g, '')
    .replace(/\bwebsite\b|\bsite\b|\bweb app\b/g, '')
    .trim()
}

function siteFromText(text) {
  const normalized = normalize(text)
  return Object.keys(SITE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find(key => new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(normalized))
}

function isChromeRequest(text) {
  return /\bchrome\b|\bgoogle chrome\b|\bbrowser\b/.test(normalize(text))
}

function isEdgeRequest(text) {
  return /\bmicrosoft edge\b|\bms edge\b|\bedge browser\b|\b(in|on)\s+edge\b/.test(normalize(text))
}

function isWebRequest(text) {
  return isChromeRequest(text) || isEdgeRequest(text) || /\bwebsite\b|\bsite\b|\bweb app\b/.test(normalize(text))
}

function looksLikeDomain(text) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(normalize(text))
}

function serviceLookupUrl(target) {
  const cleaned = stripBrowserWords(target)
  if (looksLikeDomain(cleaned)) return `https://${cleaned}`
  return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(cleaned)}`
}

function scoreMatch(query, target) {
  const q = normalize(query)
  const t = normalize(target)
  if (!q || !t) return 0
  if (q === t) return 1
  if (t.includes(q) || q.includes(t)) return 0.86
  const parts = q.split(' ')
  const hits = parts.filter(part => t.includes(part)).length
  return (hits / Math.max(parts.length, 1)) * 0.72
}

function bestLibraryMatch(query, items, type) {
  return (items || [])
    .map(item => ({ item: { ...item, type }, score: scoreMatch(query, item.name) }))
    .filter(result => result.score > 0.34)
    .sort((a, b) => b.score - a.score)[0]
}

function cleanName(text) {
  const name = String(text || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\b(on|in|inside|under|to)\s+(?:my\s+)?(?:desktop|documents?|docs|downloads?|download folder)\b/g, '')
    .replace(/\b(called|named|naming|name it|with name|with the name|as|title|titled)\b/g, '')
    .replace(/\b(a|an|the|new)\s+(folder|directory|file|text file|note|document)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return ['a', 'an', 'the', 'new'].includes(name) ? '' : name
}

function detectLocation(text) {
  const value = normalizeCommand(text)
  if (/\b(?:my\s+)?(?:downloads?|download folder)\b/.test(value)) return 'downloads'
  if (/\b(?:my\s+)?desktop\b/.test(value)) return 'desktop'
  if (/\b(?:my\s+)?(?:documents?|docs)\b/.test(value)) return 'documents'
  return null
}

function hasAny(text, words) {
  const value = normalizeCommand(text)
  return words.some(word => {
    const suffix = word.includes(' ') ? '' : 's?'
    return new RegExp(`\\b${word}${suffix}\\b`).test(value)
  })
}

function stripLocationPhrase(text) {
  return normalizeCommand(text)
    .replace(/\b(?:on|in|inside|under|to|at)\s+(?:my\s+)?(?:desktop|documents?|docs|downloads?|download folder)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCreatedItemName(text, itemWord) {
  const value = stripLocationPhrase(text)
  const patterns = [
    /(?:called|named|naming|name it|name that|with the name|with name|as|titled|title it)\s+(.+)$/,
    new RegExp(`${itemWord}(?:\\s+(?:called|named|naming|name it|as|titled))?\\s+(.+)$`),
    /(?:create|make|new|add|generate|build|set up)\s+(.+?)\s+(?:folder|directory|file|text file|note|document)$/,
  ]

  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match?.[1]) {
      const name = cleanName(match[1])
      if (name && !FOLDER_WORDS.includes(name) && !FILE_WORDS.includes(name)) return name
    }
  }

  return ''
}

function isCreateIntent(text) {
  return hasAny(text, CREATE_WORDS)
}

function isOpenIntent(text) {
  return hasAny(text, OPEN_WORDS)
}

function isFolderIntent(text) {
  return hasAny(text, FOLDER_WORDS)
}

function isFileIntent(text) {
  return hasAny(text, FILE_WORDS)
}

function extractOpenTarget(text, objectWords) {
  let value = stripLocationPhrase(stripLeadWords(text))
  objectWords.forEach(word => {
    value = value.replace(new RegExp(`\\b${word}\\b`, 'g'), '')
  })
  value = value.replace(/^(called|named|name|titled)\s+/, '')
  return cleanName(value)
}

export function getWakeResponse() {
  return WAKE_RESPONSE
}

export function parseVoiceCommand(rawText, context = {}) {
  const original = String(rawText || '').trim()
  if (WAKE_ONLY.test(normalize(original))) {
    return { type: 'wake', response: WAKE_RESPONSE, spoken: original }
  }

  const text = stripWakePhrase(original)
  const normalized = normalizeCommand(text)
  const { apps = [], games = [], recentLaunches = [] } = context

  if (!normalized) {
    return { type: 'wake', response: WAKE_RESPONSE, spoken: original }
  }

  if (normalized.includes('minimize arcade') || normalized === 'minimize') {
    return { type: 'window', action: 'minimize', response: 'Minimizing.' }
  }

  if (normalized.includes('start with windows') || normalized.includes('start on boot') || normalized.includes('startup on')) {
    return { type: 'startup', enabled: true, response: 'Startup enabled.' }
  }

  if (normalized.includes('disable startup') || normalized.includes('startup off') || normalized.includes('do not start with windows')) {
    return { type: 'startup', enabled: false, response: 'Startup disabled.' }
  }

  if (normalized.includes('open recent apps') || normalized.includes('recent apps')) {
    return { type: 'navigate', page: 'apps', response: 'Opening recent apps.' }
  }

  if (normalized.includes('show gaming setup') || normalized.includes('gaming setup')) {
    return { type: 'navigate', page: 'games', response: 'Opening games.' }
  }

  const wantsFolder = isFolderIntent(normalized)
  if (isCreateIntent(normalized) && wantsFolder) {
    const name = extractCreatedItemName(normalized, 'folders?')
    const location = detectLocation(normalized) || 'documents'
    return {
      type: 'create-folder',
      name: name || 'New Folder',
      location,
      response: `Creating ${name || 'New Folder'} in ${location}.`,
    }
  }

  const wantsTextFile = isFileIntent(normalized)
  if (isCreateIntent(normalized) && wantsTextFile) {
    const name = extractCreatedItemName(normalized, '(?:text\\s+)?files?|notes?')
    const location = detectLocation(normalized) || 'documents'
    return {
      type: 'create-text-file',
      name: name || 'New Note',
      location,
      response: `Creating ${name || 'New Note'} in ${location}.`,
    }
  }

  const requestedLocation = detectLocation(normalized)
  if (isOpenIntent(normalized) && requestedLocation && (!siteFromText(normalized) || isFolderIntent(normalized))) {
    return { type: 'open-folder', location: requestedLocation, response: `Opening ${requestedLocation}.` }
  }

  if (isOpenIntent(normalized) && isFileIntent(normalized)) {
    const fileName = extractCreatedItemName(normalized, '(?:text\\s+)?files?|notes?|documents?') || extractOpenTarget(normalized, FILE_WORDS)
    if (fileName) return { type: 'open-file', name: fileName, response: `Searching for ${fileName}.` }
  }

  const searchMatch = normalized.match(/^(?:search|find) (.+?)(?: (?:in|on) (?:(google )?chrome|(?:microsoft |ms )?edge))?$/)
  if (searchMatch?.[1]) {
    const edgeSearch = isEdgeRequest(normalized)
    return {
      type: edgeSearch ? 'edge' : 'chrome',
      url: `https://www.google.com/search?q=${encodeURIComponent(searchMatch[1])}`,
      response: edgeSearch ? 'Searching in Edge.' : 'Searching in Chrome.',
    }
  }

  const chromeSite = siteFromText(normalized)
  const target = stripBrowserWords(stripLeadWords(normalized))
  const webRequested = isWebRequest(normalized)
  const edgeRequested = isEdgeRequest(normalized)

  if (chromeSite && (webRequested || !APP_FIRST_NAMES.has(chromeSite)) && (normalized.includes('open') || normalized.includes('launch') || webRequested)) {
    return {
      type: edgeRequested ? 'edge' : 'chrome',
      url: SITE_ALIASES[chromeSite],
      response: edgeRequested
        ? `Opening ${titleCase(chromeSite)} in Edge.`
        : normalized.includes('chrome') ? `Opening ${titleCase(chromeSite)} in Chrome.` : `Opening ${titleCase(chromeSite)}.`,
    }
  }

  if (normalized === 'open browser' || normalized === 'launch browser') {
    return { type: 'chrome', url: 'https://www.google.com', response: 'Opening Chrome.' }
  }

  if (/^(open|launch|start|show)\s+/.test(normalized) && (normalized.includes('microsoft edge') || normalized.includes('ms edge') || normalized === 'open edge' || normalized === 'launch edge' || normalized === 'start edge')) {
    return { type: 'open-app', name: 'microsoft edge', response: 'Opening Microsoft Edge.' }
  }

  const appMatch = bestLibraryMatch(target, apps, 'app')
  const gameMatch = bestLibraryMatch(target, games, 'game')
  const libraryMatch = [appMatch, gameMatch].filter(Boolean).sort((a, b) => b.score - a.score)[0]
  if (libraryMatch?.score > 0.45) {
    return { type: 'launch-library', item: libraryMatch.item, response: `Opening ${libraryMatch.item.name}.` }
  }

  if (/^(open|launch|start|show)\s+/.test(normalized) && webRequested && target) {
    return {
      type: edgeRequested ? 'edge' : 'chrome',
      url: serviceLookupUrl(target),
      response: edgeRequested ? `Finding ${titleCase(target)} in Edge.` : `Finding ${titleCase(target)} in Chrome.`,
    }
  }

  if (/^(open|launch|start)\s+/.test(normalized)) {
    return { type: 'open-app', name: cleanName(target), response: `Opening ${titleCase(target)}.` }
  }

  if (recentLaunches[0] && normalized.includes('resume')) {
    return { type: 'launch-library', item: recentLaunches[0], response: `Resuming ${recentLaunches[0].name}.` }
  }

  return {
    type: 'chrome',
    url: `https://www.google.com/search?q=${encodeURIComponent(original)}`,
    response: 'Searching.',
  }
}

export function getCommandSuggestions({ apps = [], games = [], commandHistory = [] }) {
  const recentCommands = commandHistory.slice(0, 2).map(item => item.text)
  const pinnedApps = apps.filter(app => app.pinned).slice(0, 2).map(app => `Open ${app.name}`)
  const pinnedGames = games.filter(game => game.pinned).slice(0, 2).map(game => `Launch ${game.name}`)

  const suggestions = [
    ...recentCommands,
    ...pinnedApps,
    ...pinnedGames,
    'Open YouTube in Google Chrome',
    'Open YouTube on Edge',
    'Open NotebookLM in Chrome',
    'Create folder called Projects on Desktop',
  ].filter(Boolean)

  return [...new Map(suggestions.map(item => [item.toLowerCase(), item])).values()].slice(0, 5)
}
