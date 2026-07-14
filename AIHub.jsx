// AIHub Page - AI-powered assistant for gaming recommendations and tips
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
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
  const chatMessages = useStore(state => state.chatMessages)
  const addChatMessage = useStore(state => state.addChatMessage)
  const clearChat = useStore(state => state.clearChat)
  const settings = useStore(state => state.settings)
  const updateSettings = useStore(state => state.updateSettings)
  const games = useStore(state => state.games)
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

  const saveApiSettings = useCallback(() => {
    updateSettings({ aiApiKey: apiKey, aiProvider: provider })
    setShowSettings(false)
  }, [apiKey, provider, updateSettings])

  const gameList = useMemo(
    () => games.map(g => `${g.name} (${g.genre}, played ${g.launchCount} times)`).join(', '),
    [games]
  )

  const buildSystemPrompt = useCallback(() => {
    return `You are an expert AI gaming assistant integrated into Arcade OS, a premium desktop gaming launcher. 
You help users with game recommendations, tips, strategies, and library management.
The user's game library includes: ${gameList || 'no games yet'}.
Be concise, enthusiastic about gaming, and always personalize responses based on their library.
Format responses clearly with markdown-style structure when helpful.`
  }, [gameList])

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
          content:
            '⚠️ No API key configured. Click the settings icon above to add your OpenAI or Anthropic API key to enable AI responses.',
        })
        setLoading(false)
        return
      }

      const messages = [
        ...chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: text },
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

        addChatMessage({
          role: 'assistant',
          content: data.content[0].text,
        })
      } else {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
            max_tokens: 1024,
            temperature: 0.8,
          }),
        })

        data = await response.json()

        if (data.error) throw new Error(data.error.message)

        addChatMessage({
          role: 'assistant',
          content: data.choices[0].message.content,
        })
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

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',

        // ultra rich deep luxury blend
        background:
          'linear-gradient(180deg, rgba(16,18,38,0.34) 0%, rgba(20,18,48,0.28) 45%, rgba(18,20,42,0.34) 100%)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',

          // subtle rich glass
          background:
            'linear-gradient(135deg, rgba(82,68,155,0.12), rgba(45,62,130,0.08))',

          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',

          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',

          boxShadow:
            '0 10px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,

              background:
                'linear-gradient(135deg, rgba(110,90,255,0.18), rgba(78,125,255,0.14))',

              border: '1px solid rgba(255,255,255,0.08)',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              color: '#c8d4ff',

              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.16)',
            }}
          >
            <Bot size={16} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              AI HUB
            </div>

            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              {settings.aiProvider === 'anthropic'
                ? 'Claude Haiku'
                : 'GPT-4o Mini'}{' '}
              · {settings.aiApiKey ? '● Connected' : '○ No API Key'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn
            icon={<Settings size={14} />}
            onClick={() => setShowSettings(s => !s)}
            active={showSettings}
            title="API Settings"
          />

          <IconBtn
            icon={<Trash2 size={14} />}
            onClick={clearChat}
            title="Clear chat"
          />
        </div>
      </div>

      {/* API settings */}
      {showSettings && (
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',

            background:
              'linear-gradient(135deg, rgba(64,52,122,0.12), rgba(36,50,112,0.08))',

            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',

            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <label
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                }}
              >
                Provider
              </label>

              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                style={{
                  padding: '7px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.86)',
                  fontSize: 13,
                  outline: 'none',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <option value="openai">OpenAI (GPT-4o Mini)</option>
                <option value="anthropic">Anthropic (Claude Haiku)</option>
              </select>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <label
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                }}
              >
                API Key
              </label>

              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Key
                    size={12}
                    style={{
                      position: 'absolute',
                      left: 9,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  />

                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 28px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      backdropFilter: 'blur(20px)',
                    }}
                  />
                </div>

                <button
                  onClick={saveApiSettings}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,

                    background:
                      'linear-gradient(135deg, rgba(105,92,220,0.88), rgba(74,105,205,0.88))',

                    border: '1px solid rgba(255,255,255,0.08)',

                    color: '#eef2ff',
                    cursor: 'pointer',

                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.05em',

                    boxShadow:
                      '0 6px 18px rgba(60,70,150,0.25)',
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',

          display: 'flex',
          flexDirection: 'column',
          gap: 12,

          // subtle luxury ambience
          background:
            'radial-gradient(circle at top left, rgba(88,78,180,0.06), transparent 40%), radial-gradient(circle at bottom right, rgba(60,90,180,0.05), transparent 40%)',
        }}
      >
        {chatMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {chatMessages.length <= 1 && !loading && (
        <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.42)',
              marginBottom: 8,

              display: 'flex',
              alignItems: 'center',
              gap: 5,

              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={10} />
            Suggestions
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => {
                  setInput(p)
                  inputRef.current?.focus()
                }}
                style={{
                  padding: '6px 11px',
                  borderRadius: 8,

                  background: 'rgba(255,255,255,0.04)',

                  border: '1px solid rgba(255,255,255,0.06)',

                  color: 'rgba(255,255,255,0.72)',

                  cursor: 'pointer',
                  fontSize: 12,

                  backdropFilter: 'blur(18px)',

                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background =
                    'rgba(255,255,255,0.07)'
                  e.currentTarget.style.borderColor =
                    'rgba(120,120,255,0.18)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.06)'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',

          flexShrink: 0,

          background:
            'linear-gradient(180deg, rgba(28,26,56,0.18), rgba(20,22,46,0.24))',

          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',

            background: 'rgba(255,255,255,0.05)',

            border: '1px solid rgba(255,255,255,0.07)',

            borderRadius: 14,

            padding: '8px 8px 8px 14px',

            backdropFilter: 'blur(22px)',

            boxShadow:
              '0 8px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask me anything about games, tips, recommendations..."
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',

              color: 'rgba(255,255,255,0.92)',

              fontSize: 14,

              outline: 'none',
              resize: 'none',

              maxHeight: 120,
              lineHeight: 1.5,
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,

              flexShrink: 0,

              background:
                input.trim() && !loading
                  ? 'linear-gradient(135deg, rgba(110,95,235,0.92), rgba(72,102,205,0.92))'
                  : 'rgba(255,255,255,0.05)',

              border: '1px solid rgba(255,255,255,0.06)',

              color:
                input.trim() && !loading
                  ? '#eef2ff'
                  : 'rgba(255,255,255,0.35)',

              cursor:
                input.trim() && !loading
                  ? 'pointer'
                  : 'default',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              transition: 'all 0.18s ease',

              boxShadow:
                input.trim() && !loading
                  ? '0 6px 18px rgba(72,90,180,0.25)'
                  : 'none',
            }}
          >
            <Send size={15} />
          </button>
        </div>

        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            marginTop: 6,
            textAlign: 'center',
          }}
        >
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
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',

        flexDirection: isUser ? 'row-reverse' : 'row',

        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,

          flexShrink: 0,

          background: isUser
            ? 'linear-gradient(135deg, rgba(90,110,220,0.14), rgba(70,90,180,0.12))'
            : 'linear-gradient(135deg, rgba(110,90,220,0.14), rgba(70,100,190,0.12))',

          border: '1px solid rgba(255,255,255,0.07)',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          color: '#d6deff',

          backdropFilter: 'blur(20px)',
        }}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '78%',
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '11px 15px',

            background: isUser
              ? 'linear-gradient(135deg, rgba(90,105,210,0.10), rgba(70,82,175,0.08))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',

            border: '1px solid rgba(255,255,255,0.07)',

            borderRadius: isUser
              ? '14px 4px 14px 14px'
              : '4px 14px 14px 14px',

            color: 'rgba(255,255,255,0.90)',

            fontSize: 14,
            lineHeight: 1.65,

            backdropFilter: 'blur(24px)',

            boxShadow:
              '0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',

            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>

        <button
          onClick={copy}
          style={{
            position: 'absolute',

            top: 6,
            right: isUser ? 'auto' : -28,
            left: isUser ? -28 : 'auto',

            background: 'rgba(255,255,255,0.05)',

            border: '1px solid rgba(255,255,255,0.07)',

            borderRadius: 6,

            padding: 4,

            cursor: 'pointer',

            color: copied
              ? 'rgba(180,255,210,0.92)'
              : 'rgba(255,255,255,0.45)',

            backdropFilter: 'blur(16px)',
          }}
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
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,

          background:
            'linear-gradient(135deg, rgba(110,90,220,0.14), rgba(70,100,190,0.12))',

          border: '1px solid rgba(255,255,255,0.07)',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          color: '#d6deff',

          backdropFilter: 'blur(20px)',
        }}
      >
        <Bot size={14} />
      </div>

      <div
        style={{
          padding: '13px 16px',

          background:
            'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',

          border: '1px solid rgba(255,255,255,0.07)',

          borderRadius: '4px 14px 14px 14px',

          display: 'flex',
          gap: 5,
          alignItems: 'center',

          backdropFilter: 'blur(22px)',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,

              background: 'rgba(180,190,255,0.88)',

              animation: 'pulse-cyan 1.2s ease infinite',
              animationDelay: `${i * 0.2}s`,

              boxShadow:
                '0 0 8px rgba(120,140,255,0.18)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function IconBtn({ icon, onClick, active, title }) {
  const [h, setH] = useState(false)

  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,

        borderRadius: 8,

        border: `1px solid ${
          active
            ? 'rgba(120,130,255,0.16)'
            : 'rgba(255,255,255,0.06)'
        }`,

        background: active
          ? 'rgba(255,255,255,0.06)'
          : h
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.03)',

        cursor: 'pointer',

        color: active
          ? '#dbe2ff'
          : h
          ? 'rgba(255,255,255,0.88)'
          : 'rgba(255,255,255,0.45)',

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        transition: 'all 0.18s ease',

        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {icon}
    </button>
  )
}
