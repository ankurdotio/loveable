import { useState } from 'react'
import { ExternalLink, MonitorUp, RefreshCw } from 'lucide-react'

export function PreviewPane({ previewUrl }) {
  const [frameKey, setFrameKey] = useState(0)

  return (
    <section className="flex min-h-0 flex-col bg-[#111116] p-3">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-md border border-b-0 border-white/10 bg-[#202028] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="truncate font-mono text-[10px] text-zinc-400">{previewUrl || 'Preview unavailable'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-white/8 hover:text-white" type="button" onClick={() => setFrameKey((key) => key + 1)} aria-label="Refresh preview" title="Refresh preview">
            <RefreshCw className="size-3.5" />
          </button>
          {previewUrl && (
            <a className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-white/8 hover:text-white" href={previewUrl} target="_blank" rel="noreferrer" aria-label="Open preview in new tab" title="Open preview in new tab">
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-b-md border border-white/10 bg-white">
        {previewUrl ? (
          <iframe
            key={frameKey}
            className="h-full w-full border-0"
            src={previewUrl}
            title="Project preview"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[#f5f6f8] text-center text-zinc-500">
            <div>
              <MonitorUp className="mx-auto mb-4 size-8 text-zinc-300" />
              <p className="text-sm font-bold">The preview is still starting.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}