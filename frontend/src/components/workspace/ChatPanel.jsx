import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, ChevronDown, MessageSquarePlus, Send, Square, UserRound } from 'lucide-react'
import { aiApi } from '../../api/ai.js'
import { MarkdownMessage } from './MarkdownMessage.jsx'

const emptyMessages = []
const DRAFT_CONVERSATION_ID = 'draft'

function entityId(entity) {
  return entity._id || entity.id
}

function localId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function draftConversation() {
  return {
    _id: DRAFT_CONVERSATION_ID,
    title: 'New conversation',
    createdAt: new Date().toISOString(),
  }
}

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ChatPanel({ projectId, modeControl }) {
  const scrollRef = useRef(null)
  const abortRef = useRef(null)
  const bucketRef = useRef(DRAFT_CONVERSATION_ID)

  const [conversations, setConversations] = useState(() => [draftConversation()])
  const [activeId, setActiveId] = useState(DRAFT_CONVERSATION_ID)
  const [messagesByConversation, setMessagesByConversation] = useState({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const activeMessages = messagesByConversation[activeId] || emptyMessages

  const loadMessages = useCallback(async (conversationId) => {
    setIsLoadingMessages(true)
    try {
      const response = await aiApi.listMessages(conversationId)
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: response.messages || [],
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (!aiApi.enabled) return undefined
    let active = true

    aiApi
      .listConversations(projectId)
      .then((response) => {
        if (!active) return
        const items = response.conversations || []
        if (!items.length) return
        setConversations(items)
        setActiveId(entityId(items[0]))
        bucketRef.current = entityId(items[0])
        loadMessages(entityId(items[0]))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })

    return () => {
      active = false
    }
  }, [projectId, loadMessages])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeMessages])

  function startNewConversation() {
    if (isSending) return
    setError('')
    setConversations((current) =>
      current.some((conversation) => entityId(conversation) === DRAFT_CONVERSATION_ID)
        ? current
        : [draftConversation(), ...current],
    )
    setActiveId(DRAFT_CONVERSATION_ID)
    bucketRef.current = DRAFT_CONVERSATION_ID
  }

  function selectConversation(conversationId) {
    if (isSending) return
    setActiveId(conversationId)
    bucketRef.current = conversationId
    setError('')

    if (conversationId === DRAFT_CONVERSATION_ID || messagesByConversation[conversationId]) return
    loadMessages(conversationId)
  }

  function appendMessage(conversationId, item) {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] || []), item],
    }))
  }

  function patchMessage(conversationId, messageId, patch) {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: (current[conversationId] || []).map((item) =>
        entityId(item) === messageId ? { ...item, ...patch } : item,
      ),
    }))
  }

  /** Moves the optimistic draft bucket onto the conversation the server created. */
  function adoptConversation(meta) {
    const previousId = bucketRef.current
    if (previousId === meta.conversationId) return

    bucketRef.current = meta.conversationId

    setMessagesByConversation((current) => {
      const next = { ...current }
      next[meta.conversationId] = current[previousId] || []
      delete next[previousId]
      return next
    })

    setConversations((current) => {
      const withoutDraft = current.filter((conversation) => entityId(conversation) !== previousId)
      return [
        { _id: meta.conversationId, title: meta.title, createdAt: new Date().toISOString() },
        ...withoutDraft.filter((conversation) => entityId(conversation) !== meta.conversationId),
      ]
    })

    setActiveId(meta.conversationId)
  }

  function stopStreaming() {
    abortRef.current?.abort()
  }

  async function sendMessage(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return

    if (!aiApi.enabled) {
      setError('The AI service is not available in this environment.')
      return
    }

    const bucketId = activeId
    bucketRef.current = bucketId

    const replyId = localId('reply')
    appendMessage(bucketId, {
      _id: localId('user'),
      author: 'user',
      content,
      createdAt: new Date().toISOString(),
    })
    appendMessage(bucketId, {
      _id: replyId,
      author: 'ai',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    })

    setDraft('')
    setError('')
    setIsSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await aiApi.streamMessage({
        projectId,
        conversationId: bucketId === DRAFT_CONVERSATION_ID ? undefined : bucketId,
        content,
        signal: controller.signal,
        onMeta: adoptConversation,
        onToken: (value) => {
          setMessagesByConversation((current) => ({
            ...current,
            [bucketRef.current]: (current[bucketRef.current] || []).map((item) =>
              entityId(item) === replyId ? { ...item, content: item.content + value } : item,
            ),
          }))
        },
      })

      patchMessage(bucketRef.current, replyId, { streaming: false })
    } catch (requestError) {
      setError(requestError.message)
      patchMessage(bucketRef.current, replyId, { streaming: false, failed: true })
    } finally {
      abortRef.current = null
      setIsSending(false)
    }
  }

  return (
    <aside className="relative flex min-h-0 flex-col border-l border-white/8 bg-[#17171d]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/8 px-3 pr-28">
        <div className="relative min-w-0 flex-1">
          <select
            className="h-9 w-full appearance-none truncate rounded border border-white/8 bg-[#111116] pr-8 pl-3 text-xs font-bold text-zinc-300 outline-none hover:border-white/15 focus:border-cyan-500 disabled:opacity-50"
            value={activeId}
            onChange={(event) => selectConversation(event.target.value)}
            disabled={isSending}
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
        <button
          className="grid size-9 shrink-0 place-items-center rounded border border-white/8 text-zinc-500 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          onClick={startNewConversation}
          disabled={isSending}
          aria-label="New conversation"
          title="New conversation"
        >
          <MessageSquarePlus className="size-4" />
        </button>
      </div>

      <div className="absolute top-2.5 right-3 z-10">{modeControl}</div>

      <div ref={scrollRef} className="ide-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {isLoadingMessages && activeMessages.length === 0 && (
          <p className="text-center text-xs font-semibold text-zinc-600">Loading conversation...</p>
        )}

        {!isLoadingMessages && activeMessages.length === 0 && (
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

        {activeMessages.map((item) => {
          const isUser = item.author === 'user'

          return (
            <article key={entityId(item)} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded ${isUser ? 'bg-zinc-700 text-zinc-300' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {isUser ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <div className={`min-w-0 max-w-[82%] ${isUser ? 'text-right' : ''}`}>
                {isUser ? (
                  <p className="rounded-md bg-cyan-700 px-3 py-2.5 text-left text-xs leading-5 font-medium break-words whitespace-pre-wrap text-white">
                    {item.content}
                  </p>
                ) : (
                  <div className={`rounded-md border px-3 py-2.5 text-left ${item.failed ? 'border-red-500/30 bg-red-500/5' : 'border-white/8 bg-[#202028]'}`}>
                    {item.content ? (
                      <MarkdownMessage content={item.content} />
                    ) : item.streaming ? (
                      <span className="flex items-center gap-1.5 py-0.5">
                        <span className="size-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-cyan-400" />
                      </span>
                    ) : (
                      <p className="text-xs font-medium text-zinc-600">No response.</p>
                    )}

                    {item.failed && (
                      <p className="mt-2 flex items-start gap-1.5 text-[10px] font-semibold text-red-300">
                        <AlertTriangle className="mt-px size-3 shrink-0" />
                        This response did not complete.
                      </p>
                    )}
                  </div>
                )}
                <time className="mt-1.5 block text-[9px] font-semibold text-zinc-700">{formatTime(item.createdAt)}</time>
              </div>
            </article>
          )
        })}
      </div>

      <form className="shrink-0 border-t border-white/8 p-3" onSubmit={sendMessage}>
        {error && (
          <div className="mb-2 flex items-start gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5" role="alert">
            <AlertTriangle className="mt-px size-3 shrink-0 text-red-300" />
            <p className="text-[10px] leading-4 font-semibold text-red-300">{error}</p>
          </div>
        )}
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
              {isSending ? 'Thinking...' : aiApi.enabled ? 'Connected' : 'Offline'}
            </span>
            {isSending ? (
              <button
                className="grid size-8 place-items-center rounded border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                type="button"
                onClick={stopStreaming}
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="size-3" />
              </button>
            ) : (
              <button
                className="grid size-8 place-items-center rounded bg-cyan-700 text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
                title="Send message"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </aside>
  )
}
