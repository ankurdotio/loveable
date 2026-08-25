import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, MessageSquarePlus, Send, UserRound } from 'lucide-react'
import { aiApi } from '../../api/ai.js'

const emptyMessages = []

function entityId(entity) {
  return entity._id || entity.id
}

function localConversation() {
  return {
    _id: `local-${crypto.randomUUID()}`,
    title: 'New conversation',
    createdAt: new Date().toISOString(),
  }
}

function message(author, content) {
  return {
    _id: `local-${crypto.randomUUID()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ChatPanel({ projectId, modeControl }) {
  const scrollRef = useRef(null)
  const initialConversationId = `local-${projectId}-initial`
  const [conversations, setConversations] = useState(() => [{
    _id: initialConversationId,
    title: 'New conversation',
    createdAt: new Date().toISOString(),
  }])
  const [activeId, setActiveId] = useState(initialConversationId)
  const [messagesByConversation, setMessagesByConversation] = useState({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  const activeMessages = messagesByConversation[activeId] || emptyMessages

  useEffect(() => {
    if (!aiApi.enabled) return undefined
    let active = true

    aiApi
      .listConversations(projectId)
      .then((response) => {
        const items = response.conversations || response
        if (active && Array.isArray(items) && items.length) {
          setConversations(items)
          setActiveId(entityId(items[0]))
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })

    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeMessages])

  async function createConversation() {
    setError('')
    try {
      const created = aiApi.enabled
        ? await aiApi.createConversation(projectId, 'New conversation')
        : localConversation()
      const conversation = created.conversation || created
      setConversations((current) => [conversation, ...current])
      setActiveId(entityId(conversation))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function selectConversation(conversationId) {
    setActiveId(conversationId)
    setError('')

    if (!aiApi.enabled || messagesByConversation[conversationId]) return

    try {
      const response = await aiApi.listMessages(conversationId)
      const messages = response.messages || response
      setMessagesByConversation((current) => ({ ...current, [conversationId]: messages }))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return

    const userMessage = message('user', content)
    setMessagesByConversation((current) => ({
      ...current,
      [activeId]: [...(current[activeId] || []), userMessage],
    }))
    setConversations((current) =>
      current.map((conversation) =>
        entityId(conversation) === activeId && conversation.title === 'New conversation'
          ? { ...conversation, title: content.slice(0, 36) }
          : conversation,
      ),
    )
    setDraft('')
    setError('')
    setIsSending(true)

    try {
      if (aiApi.enabled) {
        const response = await aiApi.sendMessage(activeId, content)
        const returnedMessages = response.messages || [response.message || response]
        setMessagesByConversation((current) => ({
          ...current,
          [activeId]: [...(current[activeId] || []), ...returnedMessages.filter(Boolean)],
        }))
      } else {
        setMessagesByConversation((current) => ({
          ...current,
          [activeId]: [
            ...(current[activeId] || []),
            message('ai', 'The AI service is not available in this environment yet.'),
          ],
        }))
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <aside className="relative flex min-h-0 flex-col border-l border-white/8 bg-[#17171d]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/8 px-3 pr-28">
        <div className="relative min-w-0 flex-1">
          <select
            className="h-9 w-full appearance-none truncate rounded border border-white/8 bg-[#111116] pr-8 pl-3 text-xs font-bold text-zinc-300 outline-none hover:border-white/15 focus:border-cyan-500"
            value={activeId}
            onChange={(event) => selectConversation(event.target.value)}
            aria-label="Conversation"
          >
            {conversations.map((conversation) => (
              <option key={entityId(conversation)} value={entityId(conversation)}>
                {conversation.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-3 right-2.5 size-3.5 text-zinc-600" />
        </div>
        <button className="grid size-9 shrink-0 place-items-center rounded border border-white/8 text-zinc-500 hover:bg-white/5 hover:text-white" type="button" onClick={createConversation} aria-label="New conversation" title="New conversation">
          <MessageSquarePlus className="size-4" />
        </button>
      </div>

      <div className="absolute top-2.5 right-3 z-10">{modeControl}</div>

      <div ref={scrollRef} className="ide-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {activeMessages.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-52">
              <span className="mx-auto mb-4 grid size-10 place-items-center rounded-md bg-cyan-500/10 text-cyan-400">
                <Bot className="size-5" />
              </span>
              <p className="text-sm font-extrabold text-zinc-300">What are we building?</p>
              <p className="mt-2 text-xs leading-5 font-medium text-zinc-600">Ask about this project or start a new change.</p>
            </div>
          </div>
        )}

        {activeMessages.map((item) => (
          <article key={entityId(item)} className={`flex gap-2.5 ${item.author === 'user' ? 'flex-row-reverse' : ''}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded ${item.author === 'user' ? 'bg-zinc-700 text-zinc-300' : 'bg-cyan-500/10 text-cyan-400'}`}>
              {item.author === 'user' ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <div className={`max-w-[82%] ${item.author === 'user' ? 'text-right' : ''}`}>
              <p className={`whitespace-pre-wrap rounded-md px-3 py-2.5 text-left text-xs leading-5 font-medium ${item.author === 'user' ? 'bg-cyan-700 text-white' : 'border border-white/8 bg-[#202028] text-zinc-300'}`}>
                {item.content}
              </p>
              <time className="mt-1.5 block text-[9px] font-semibold text-zinc-700">{formatTime(item.createdAt)}</time>
            </div>
          </article>
        ))}
      </div>

      <form className="shrink-0 border-t border-white/8 p-3" onSubmit={sendMessage}>
        {error && <p className="mb-2 text-[10px] font-semibold text-red-300">{error}</p>}
        <div className="rounded-md border border-white/10 bg-[#111116] p-2 focus-within:border-cyan-500/70">
          <textarea
            className="max-h-32 min-h-16 w-full resize-none bg-transparent px-1 text-xs leading-5 font-medium text-zinc-200 outline-none placeholder:text-zinc-600"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Ask Loveable AI..."
            aria-label="Message"
          />
          <div className="flex items-center justify-between gap-3 px-1">
            <span className={`text-[9px] font-bold uppercase ${aiApi.enabled ? 'text-emerald-500' : 'text-zinc-700'}`}>
              {aiApi.enabled ? 'Connected' : 'Offline'}
            </span>
            <button className="grid size-8 place-items-center rounded bg-cyan-700 text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message" title="Send message">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </form>
    </aside>
  )
}