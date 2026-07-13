import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Search, Sparkles, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getCommandSuggestions, parseVoiceCommand } from '../ai/voiceCommandEngine'

const isElectron = typeof window !== 'undefined' && window.arcadeOS
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function speak(text) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.96
  utterance.pitch = 0.82
  utterance.volume = 0.55
  window.speechSynthesis.speak(utterance)
}

export default function AmbientCommandLayer() {
  const apps = useStore(state => state.apps)
  const games = useStore(state => state.games)
  const recentLaunches = useStore(state => state.recentLaunches)
  const commandHistory = useStore(state => state.commandHistory)
  const aiCommandState = useStore(state => state.aiCommandState)
  const setAICommandState = useStore(state => state.setAICommandState)
  const rememberCommand = useStore(state => state.rememberCommand)
  const launchItem = useStore(state => state.launchItem)
  const setActivePage = useStore(state => state.setActivePage)
  const addNotification = useStore(state => state.addNotification)

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [voiceSupported] = useState(Boolean(SpeechRecognition))
  const voiceAvailable = voiceSupported || (isElectron && Boolean(window.arcadeOS.ai?.listenOnce))
  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)

  const suggestions = useMemo(() => getCommandSuggestions({ apps, games, commandHistory }), [apps, games, commandHistory])

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!isElectron || !window.arcadeOS.ai?.onQuickCommand) return
    window.arcadeOS.ai.onQuickCommand(() => setOpen(true))
  }, [])

  useEffect(() => {
    if (!voiceSupported) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      listeningRef.current = true
      setAICommandState({ listening: true, response: 'Listening.' })
    }

    recognition.onend = () => {
      listeningRef.current = false
      setAICommandState({ listening: false })
    }

    recognition.onerror = () => {
      listeningRef.current = false
      setAICommandState({ listening: false, processing: false, response: 'Voice unavailable.' })
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ').trim()
      if (transcript) execute(transcript, true)
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [voiceSupported])

  async function execute(raw, fromVoice = false) {
    const command = parseVoiceCommand(raw, { apps, games, recentLaunches })
    setAICommandState({ processing: true, lastCommand: raw, response: command.response || 'Working.' })
    if (fromVoice) speak(command.response)

    let result = { success: true }
    try {
      switch (command.type) {
        case 'wake':
          result = { success: true, type: 'wake' }
          break
        case 'chrome':
          result = isElectron
            ? await window.arcadeOS.ai.openInChrome(command.url)
            : (window.open(command.url, '_blank'), { success: true })
          break
        case 'edge':
          result = isElectron
            ? await window.arcadeOS.ai.openInEdge(command.url)
            : (window.open(command.url, '_blank'), { success: true })
          break
        case 'open-app':
          result = isElectron
            ? await window.arcadeOS.ai.openApp(command.name)
            : { success: false, error: 'Desktop app launching requires Electron.' }
          break
        case 'launch-library':
          await launchItem(command.item, command.item.type)
          result = { success: true }
          break
        case 'create-folder':
          result = isElectron
            ? await window.arcadeOS.ai.createFolder(command.name, command.location)
            : { success: false, error: 'Folder creation requires Electron.' }
          break
        case 'create-text-file':
          result = isElectron
            ? await window.arcadeOS.ai.createTextFile(command.name, command.location)
            : { success: false, error: 'File creation requires Electron.' }
          break
        case 'open-folder':
          result = isElectron
            ? await window.arcadeOS.ai.openFolder(command.location)
            : { success: false, error: 'Folder opening requires Electron.' }
          break
        case 'open-file':
          result = isElectron
            ? await window.arcadeOS.ai.openFile(command.name)
            : { success: false, error: 'File opening requires Electron.' }
          break
        case 'window':
          if (command.action === 'minimize' && isElectron) await window.arcadeOS.window.minimize()
          result = { success: true }
          break
        case 'startup':
          result = isElectron
            ? await window.arcadeOS.ai.setStartup(command.enabled)
            : { success: false, error: 'Startup control requires Electron.' }
          break
        case 'navigate':
          setActivePage(command.page)
          result = { success: true }
          break
        default:
          result = { success: false, error: 'Command not understood.' }
      }
    } catch (err) {
      result = { success: false, error: err.message }
    }

    const response = result.success ? (command.type === 'wake' ? command.response : 'Done.') : result.error
    setAICommandState({ processing: false, response })
    rememberCommand(raw, { type: command.type, success: result.success })
    addNotification({ type: result.success ? 'info' : 'warning', message: result.success ? command.response || 'Done.' : result.error })
    if (fromVoice && command.type !== 'wake') speak(response)
    setText('')
    setOpen(false)
  }

  function startVoice() {
    if (listeningRef.current) return
    setOpen(false)
    if (recognitionRef.current) {
      recognitionRef.current.start()
      return
    }

    if (isElectron && window.arcadeOS.ai?.listenOnce) {
      listeningRef.current = true
      setAICommandState({ listening: true, response: 'Listening.' })
      window.arcadeOS.ai.listenOnce().then(result => {
        listeningRef.current = false
        setAICommandState({ listening: false })
        if (result?.success && result.transcript) {
          execute(result.transcript, true)
        } else {
          setAICommandState({ processing: false, response: result?.error || 'No speech detected.' })
        }
      })
    }
  }

  return (
    <>
      <div className={`ambient-ai-edge ${aiCommandState.listening ? 'is-listening' : ''}`} />
      <div className={`ambient-command-pill ${aiCommandState.listening ? 'is-listening' : ''}`}>
        <button className="ambient-icon-btn" onClick={() => setOpen(true)} title="Command">
          <Sparkles size={13} />
        </button>
        <div className="ambient-status">
          <span>VAULT</span>
          <small>{aiCommandState.listening ? 'Listening' : aiCommandState.processing ? 'Working' : aiCommandState.response}</small>
        </div>
        <button className="ambient-icon-btn" onClick={startVoice} disabled={!voiceAvailable} title={voiceAvailable ? 'Push to talk' : 'Voice unavailable'}>
          <Mic size={13} />
        </button>
        <div className="ambient-wave" aria-hidden="true">
          <i /><i /><i />
        </div>
      </div>

      {open && (
        <div className="command-overlay" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="command-panel">
            <div className="command-input-row">
              <Search size={15} />
              <input
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') execute(text)
                }}
                placeholder='Try "hey VAULT open YouTube in Chrome"'
              />
              <button onClick={() => setOpen(false)} title="Close"><X size={14} /></button>
            </div>
            <div className="command-suggestions">
              {suggestions.map((suggestion, index) => (
                <button key={`${suggestion}-${index}`} onClick={() => execute(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
