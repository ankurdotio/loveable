import { apiRequest } from './client.js'

const AI_BASE = '/api/ai'

export const aiApi = {
    enabled: import.meta.env.VITE_ENABLE_AI_API === 'true',

    listConversations(projectId) {
        return apiRequest(`${AI_BASE}/projects/${projectId}/conversations`)
    },

    createConversation(projectId, title) {
        return apiRequest(`${AI_BASE}/projects/${projectId}/conversations`, {
            method: 'POST',
            body: JSON.stringify({ title }),
        })
    },

    listMessages(conversationId) {
        return apiRequest(`${AI_BASE}/conversations/${conversationId}/messages`)
    },

    sendMessage(conversationId, content) {
        return apiRequest(`${AI_BASE}/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, author: 'user' }),
        })
    },
}