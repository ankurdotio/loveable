import { ApiError, apiRequest, getAccessToken, refreshAccessToken } from './client.js'

const AI_BASE = '/api/ai'

/** Wall-clock budget for a single agent turn before the client gives up. */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000

function friendlyError(error) {
    if (error?.name === 'AbortError') {
        return 'The request was cancelled.'
    }

    if (error?.name === 'TimeoutError') {
        return `The AI took longer than ${Math.round(STREAM_TIMEOUT_MS / 60000)} minutes to respond and the request timed out. Please try again.`
    }

    if (error instanceof ApiError) {
        if (error.status === 401) return 'Your session expired. Please sign in again.'
        if (error.status === 404) return 'This project or conversation is no longer available.'
        if (error.status >= 502 && error.status <= 504) {
            return 'The AI service is unreachable right now. Please try again in a moment.'
        }
        return error.message
    }

    if (error instanceof TypeError) {
        return 'Lost connection to the AI service. Check your network and try again.'
    }

    return error?.message || 'Something went wrong while talking to the AI service.'
}

async function readErrorBody(response) {
    const contentType = response.headers.get('content-type') || ''

    try {
        if (contentType.includes('application/json')) {
            const payload = await response.json()
            return payload?.message || payload?.error || null
        }
        const text = await response.text()
        return text.trim() || null
    } catch {
        return null
    }
}

/**
 * Streams one agent turn over SSE.
 *
 * Server events are `{ type: 'meta' | 'token' | 'done' | 'error' }`; tool calls
 * and tool results are never emitted, only assistant prose.
 */
async function streamMessage({ projectId, conversationId, content, onMeta, onToken, signal }) {
    const timeoutSignal = AbortSignal.timeout(STREAM_TIMEOUT_MS)
    const streamSignal = signal ? AbortSignal.any([ signal, timeoutSignal ]) : timeoutSignal

    async function post(retry) {
        const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' }
        const token = getAccessToken()
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(`${AI_BASE}/message`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ projectId, conversationId, content }),
            signal: streamSignal,
        })

        if (response.status === 401 && retry) {
            await refreshAccessToken()
            return post(false)
        }

        return response
    }

    let response
    try {
        response = await post(true)
    } catch (error) {
        throw new Error(friendlyError(error), { cause: error })
    }

    if (!response.ok || !response.body) {
        const message = await readErrorBody(response)
        throw new Error(
            friendlyError(new ApiError(message || `Request failed with status ${response.status}`, response.status)),
        )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamError = null

    function handleEvent(raw) {
        const data = raw
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')

        if (!data) return

        let event
        try {
            event = JSON.parse(data)
        } catch {
            return
        }

        if (event.type === 'meta') onMeta?.(event)
        else if (event.type === 'token') onToken?.(event.value)
        else if (event.type === 'error') streamError = event.message
    }

    try {
        for (; ;) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            let boundary = buffer.indexOf('\n\n')
            while (boundary !== -1) {
                handleEvent(buffer.slice(0, boundary))
                buffer = buffer.slice(boundary + 2)
                boundary = buffer.indexOf('\n\n')
            }
        }
        if (buffer.trim()) handleEvent(buffer)
    } catch (error) {
        throw new Error(friendlyError(error), { cause: error })
    } finally {
        reader.cancel().catch(() => { })
    }

    if (streamError) {
        throw new Error(streamError)
    }
}

export const aiApi = {
    enabled: import.meta.env.VITE_ENABLE_AI_API !== 'false',

    async listConversations(projectId) {
        try {
            return await apiRequest(`${AI_BASE}/projects/${projectId}/conversations`)
        } catch (error) {
            throw new Error(friendlyError(error), { cause: error })
        }
    },

    async createConversation(projectId, title) {
        try {
            return await apiRequest(`${AI_BASE}/projects/${projectId}/conversations`, {
                method: 'POST',
                body: JSON.stringify({ title }),
            })
        } catch (error) {
            throw new Error(friendlyError(error), { cause: error })
        }
    },

    async listMessages(conversationId) {
        try {
            return await apiRequest(`${AI_BASE}/conversations/${conversationId}/messages`)
        } catch (error) {
            throw new Error(friendlyError(error), { cause: error })
        }
    },

    streamMessage,
}