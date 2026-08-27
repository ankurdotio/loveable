# Loveable frontend

Host-run React and Vite client for the Loveable Kubernetes development stack.

## Development

Prerequisites:

- Node.js 20 or newer
- The Kubernetes ingress available at `http://localhost`

```bash
npm install
npm run dev
```

Vite proxies `/api/*` to `http://localhost`. Runtime file requests use
`/runtime/:runtimeId/*`; the proxy removes that prefix and sets the request
host to `:runtimeId.file-system.localhost` for the wildcard ingress.

## AI API

AI calls are enabled by default. Set `VITE_ENABLE_AI_API=false` to run the
workspace without the AI service.

The client uses:

- `GET /api/ai/projects/:projectId/conversations` — conversation list
- `POST /api/ai/projects/:projectId/conversations` — create a conversation
- `GET /api/ai/conversations/:conversationId/messages` — message history
  (user and assistant messages only; tool calls stay server side)
- `POST /api/ai/message` — streams one agent turn as SSE events shaped
  `{ type: 'meta' | 'token' | 'done' | 'error' }`

Assistant messages are rendered as Markdown via `react-markdown`.

## Checks

```bash
npm run lint
npm run build
```
