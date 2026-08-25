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

## AI API skeleton

AI calls are disabled until the AI service exposes routes. Enable the prepared
client by setting:

```bash
VITE_ENABLE_AI_API=true
```

The client expects project conversations at
`/api/ai/projects/:projectId/conversations` and messages at
`/api/ai/conversations/:conversationId/messages`. These shapes match the
conversation and message models in `ai-service`.

## Checks

```bash
npm run lint
npm run build
```
