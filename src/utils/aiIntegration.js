// utils/aiIntegration.js - AI API integration helpers

export async function callOpenAI({ messages, apiKey, systemPrompt, model = 'gpt-4o-mini' }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

export async function callAnthropic({ messages, apiKey, systemPrompt, model = 'claude-haiku-4-5-20251001' }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}

export function buildGamingSystemPrompt(games = []) {
  const list = games.map(g => `${g.name} (${g.genre}, ${g.launchCount} plays)`).join(', ') || 'empty library'
  return `You are an expert AI gaming assistant in Arcade OS. Help users with game recommendations, tips, strategies, and library management. User's library: ${list}. Be concise, helpful, and enthusiastic about gaming.`
}
