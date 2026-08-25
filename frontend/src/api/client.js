let accessToken = null
let refreshPromise = null

export class ApiError extends Error {
    constructor(message, status, details) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
    }
}

export function setAccessToken(token) {
    accessToken = token || null
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text()

    if (!response.ok) {
        const message =
            typeof payload === 'object' && payload?.message
                ? payload.message
                : `Request failed with status ${response.status}`
        throw new ApiError(message, response.status, payload)
    }

    return payload
}

export async function refreshAccessToken() {
    if (!refreshPromise) {
        refreshPromise = fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        })
            .then(parseResponse)
            .then((session) => {
                setAccessToken(session.accessToken)
                return session
            })
            .finally(() => {
                refreshPromise = null
            })
    }

    return refreshPromise
}

export async function apiRequest(path, options = {}) {
    const {
        auth = true,
        retry = true,
        headers: customHeaders,
        ...fetchOptions
    } = options
    const headers = new Headers(customHeaders)

    if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json')
    }

    if (auth && accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const response = await fetch(path, {
        ...fetchOptions,
        credentials: 'include',
        headers,
    })

    if (response.status === 401 && auth && retry) {
        await refreshAccessToken()
        return apiRequest(path, { ...options, retry: false })
    }

    return parseResponse(response)
}