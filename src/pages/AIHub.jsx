// AIHub Page - AI-powered assistant for gaming recommendations and tips
import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Trash2, Settings, Sparkles, User, Copy, Check, Key } from 'lucide-react'
import { useStore } from '../store/useStore'

const SUGGESTED_PROMPTS = [
  'What games should I play next based on my library?',
  'Give me tips for Elden Ring',
  'Recommend a co-op game to play with friends',
  'What are the best RPGs of 2024?',
  'How do I improve my FPS skills?',
  'Compare Cyberpunk 2077 vs Starfield',
]

export default function AIHub() {
  const { chatMessages, addChatMessage, clearChat, settings, updateSettings, games } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(settings.aiApiKey || '')
  const [provider, setProvider] = useState(settings.aiProvider || 'openai')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, loading])

  const saveApiSettings = () => {
    updateSettings({ aiApiKey: apiKey, aiProvider: provider })
    setShowSettings(false)
  }

  const buildSystemPrompt = () => {
    const gameList = games.map(g => `${g.name} (${g.genre}, played ${g.launchCount} times)`).join(', ')
    return `You are an expert AI gaming assistant integrated into Arcade OS, a premium desktop gaming launcher. 
You help users with game recommendations, tips, strategies, and library management.
The user's game library includes: ${gameList || 'no games yet'}.
Be concise, enthusiastic about gaming, and always personalize responses based on their library.
Format responses clearly with markdown-style structure when helpful.`
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    addChatMessage({ role: 'user', content: text })
    setLoading(true)

    try {
      const key = settings.aiApiKey
      if (!key) {
        addChatMessage({
          role: 'assistant',
          content: '⚠️ No API key configured. Click the settings icon above to add your OpenAI or Anthropic API key to enable AI responses.',
        })
        setLoading(false)
        return
      }

      const messages = [
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ]

      let response, data

      if (settings.aiProvider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: buildSystemPrompt(),
            messages: messages.filter(m => m.role !== 'system'),
          }),
        })
        data = await response.json()
        if (data.error) throw new Error(data.error.message)
        addChatMessage({ role: 'assistant', content: data.content[0].text })
      } else {
        // OpenAI
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
            max_tokens: 1024,
            temperature: 0.8,
          }),
        })
        data = await response.json()
        if (data.error) throw new Error(data.error.message)
        addChatMessage({ role: 'assistant', content: data.choices[0].message.content })
      }
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        content: `❌ Error: ${err.message}. Please check your API key and try again.`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-void)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim))', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
            <Bot size={16} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>AI HUB</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{settings.aiProvider === 'anthropic' ? 'Claude Haiku' : 'GPT-4o Mini'} · {settings.aiApiKey ? '● Connected' : '○ No API Key'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn icon={<Settings size={14} />} onClick={() => setShowSettings(s => !s)} active={showSettings} title="API Settings" />
          <IconBtn icon={<Trash2 size={14} />} onClick={clearChat} title="Clear chat" />
        </div>
      </div>

      {/* API settings panel */}
      {showSettings && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)' }}>
                <option value="openai">OpenAI (GPT-4o Mini)</option>
                <option value="anthropic">Anthropic (Claude Haiku)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>API Key</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Key size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                </div>
                <button onClick={saveApiSettings} style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--accent-cyan)', border: 'none', color: '#000', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chatMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {chatMessages.length <= 1 && !loading && (
        <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase' }}>
            <Sparkles size={10} /> Suggestions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_PROMPTS.map(p => (
              <button key={p} onClick={() => { setInput(p); inputRef.current?.focus() }} style={{
                padding: '5px 10px', borderRadius: 6,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)40'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, background: 'var(--bg-void)' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
          borderRadius: 10, padding: '8px 8px 8px 14px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask me anything about games, tips, recommendations..."
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: 'var(--text-primary)', fontSize: 14,
              fontFamily: 'var(--font-body)', outline: 'none', resize: 'none',
              maxHeight: 120, lineHeight: 1.5,
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
            width: 36, height: 36, borderRadius: 7, flexShrink: 0,
            background: input.trim() && !loading ? 'var(--accent-cyan)' : 'var(--bg-hover)',
            border: 'none', color: input.trim() && !loading ? '#000' : 'var(--text-dim)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}>
            <Send size={15} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row', animation: 'fadeIn 0.2s ease' }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: isUser ? 'var(--accent-cyan-dim)' : 'linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim))',
        border: `1px solid ${isUser ? 'var(--accent-cyan)30' : 'var(--border-dim)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isUser ? 'var(--accent-cyan)' : 'var(--accent-purple)',
      }}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '78%', position: 'relative' }} className="group">
        <div style={{
          padding: '10px 14px',
          background: isUser ? 'var(--accent-cyan-dim)' : 'var(--bg-card)',
          border: `1px solid ${isUser ? 'var(--accent-cyan)30' : 'var(--border-subtle)'}`,
          borderRadius: isUser ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
          color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6,
          fontFamily: 'var(--font-body)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
        <button onClick={copy} style={{
          position: 'absolute', top: 6, right: isUser ? 'auto' : -28, left: isUser ? -28 : 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
          borderRadius: 4, padding: 4, cursor: 'pointer',
          color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
          opacity: 0, transition: 'opacity var(--transition-fast)',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0}
        title="Copy"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim))', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
        <Bot size={14} />
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '2px 10px 10px 10px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: 99,
            background: 'var(--accent-cyan)',
            animation: 'pulse-cyan 1.2s ease infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

function IconBtn({ icon, onClick, active, title }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} title={title} style={{
      width: 32, height: 32, borderRadius: 6, border: `1px solid ${active ? 'var(--border-normal)' : 'var(--border-dim)'}`,
      background: active ? 'var(--bg-elevated)' : h ? 'var(--bg-elevated)' : 'transparent',
      cursor: 'pointer', color: active ? 'var(--accent-cyan)' : h ? 'var(--text-primary)' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all var(--transition-fast)',
    }}
    onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    >
      {icon}
    </button>
  )
}
