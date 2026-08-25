import { useEffect, useEffectEvent } from 'react'
import Editor from '@monaco-editor/react'
import { FileCode2, Save, X } from 'lucide-react'
import { languageForPath } from '../../utils/fileTree.js'

export function CodeEditorPane({
  tabs,
  activePath,
  onSelect,
  onClose,
  onChange,
  onSave,
  isSaving,
}) {
  const activeTab = tabs.find((tab) => tab.path === activePath)
  const saveActive = useEffectEvent(() => {
    if (activeTab) onSave(activeTab.path)
  })

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveActive()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-[#111116]">
      <div className="flex h-11 shrink-0 border-b border-white/8 bg-[#17171d]">
        <div className="ide-scroll flex min-w-0 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              className={`group flex h-11 min-w-36 max-w-52 shrink-0 items-center gap-2 border-r border-white/8 px-3 text-xs font-semibold ${tab.path === activePath ? 'border-t-2 border-t-cyan-500 bg-[#111116] text-zinc-200' : 'border-t-2 border-t-transparent text-zinc-500 hover:bg-white/3 hover:text-zinc-300'}`}
              type="button"
              onClick={() => onSelect(tab.path)}
              title={tab.path}
            >
              <FileCode2 className="size-3.5 shrink-0 text-sky-400" />
              <span className="min-w-0 flex-1 truncate">{tab.path.split('/').pop()}</span>
              {tab.isDirty && <span className="size-1.5 shrink-0 rounded-full bg-amber-400" title="Unsaved changes" />}
              <span
                className="grid size-5 shrink-0 place-items-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation()
                  onClose(tab.path)
                }}
                role="button"
                aria-label={`Close ${tab.path}`}
                title="Close"
              >
                <X className="size-3" />
              </span>
            </button>
          ))}
        </div>
        {activeTab && (
          <button
            className="flex w-11 shrink-0 items-center justify-center border-l border-white/8 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-40"
            type="button"
            onClick={() => onSave(activeTab.path)}
            disabled={isSaving || !activeTab.isDirty}
            aria-label="Save file"
            title="Save file"
          >
            <Save className="size-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab ? (
          <Editor
            path={activeTab.path}
            language={languageForPath(activeTab.path)}
            value={activeTab.content}
            theme="vs-dark"
            onChange={(value) => onChange(activeTab.path, value || '')}
            options={{
              automaticLayout: true,
              fontFamily: 'JetBrains Mono Variable',
              fontLigatures: true,
              fontSize: 13,
              lineHeight: 21,
              minimap: { enabled: false },
              padding: { top: 14 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
            loading={<div className="grid h-full place-items-center text-xs font-semibold text-zinc-600">Loading editor...</div>}
          />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <FileCode2 className="mx-auto mb-4 size-8 text-zinc-700" />
              <p className="text-sm font-bold text-zinc-500">Select a file to start editing</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}