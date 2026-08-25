import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  FileCode2,
  FileJson2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Tree } from 'react-arborist'
import { filesApi } from '../../api/files.js'
import {
  buildFileTree,
  joinFilePath,
  parentPath,
} from '../../utils/fileTree.js'

function FileIcon({ node }) {
  if (node.data.type === 'folder') {
    return node.isOpen ? (
      <FolderOpen className="size-4 text-cyan-400" />
    ) : (
      <Folder className="size-4 text-cyan-400" />
    )
  }

  if (node.data.name.endsWith('.json')) return <FileJson2 className="size-4 text-amber-400" />
  if (/\.(jsx?|tsx?|css|html|py|go|rs)$/.test(node.data.name)) {
    return <FileCode2 className="size-4 text-sky-400" />
  }
  return <FileText className="size-4 text-zinc-500" />
}

function FileNode({ node, style, dragHandle }) {
  return (
    <div
      ref={dragHandle}
      style={style}
      className={`group flex items-center gap-1.5 pr-1 text-xs font-semibold text-zinc-400 ${node.isSelected ? 'bg-cyan-500/15 text-white' : 'hover:bg-white/5 hover:text-zinc-200'}`}
      onClick={(event) => {
        event.stopPropagation()
        if (node.isInternal) {
          node.toggle()
        } else {
          node.select()
          node.data.onOpen(node.id)
        }
      }}
    >
      <span className="grid size-4 shrink-0 place-items-center">
        {node.isInternal && (
          <ChevronRight className={`size-3 transition ${node.isOpen ? 'rotate-90' : ''}`} />
        )}
      </span>
      <FileIcon node={node} />
      <span className="min-w-0 flex-1 truncate">{node.data.name}</span>
      <span className="hidden items-center gap-0.5 group-hover:flex">
        <button
          type="button"
          className="grid size-6 place-items-center rounded text-zinc-500 hover:bg-white/10 hover:text-white"
          onClick={(event) => {
            event.stopPropagation()
            node.data.onRename(node.data)
          }}
          aria-label={`Rename ${node.data.name}`}
          title="Rename"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          className="grid size-6 place-items-center rounded text-zinc-500 hover:bg-red-500/15 hover:text-red-300"
          onClick={(event) => {
            event.stopPropagation()
            node.data.onDelete(node.data)
          }}
          aria-label={`Delete ${node.data.name}`}
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </span>
    </div>
  )
}

export function FileExplorer({
  runtimeId,
  filePaths,
  activePath,
  onOpen,
  onRefresh,
  onRelocate,
  onRemove,
}) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 260, height: 400 })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [isMutating, setIsMutating] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined

    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: Math.max(180, Math.floor(entry.contentRect.width)),
        height: Math.max(160, Math.floor(entry.contentRect.height)),
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function requestRename(node) {
    setDialog({ type: 'rename', node, initialValue: node.name })
  }

  async function deleteNode(node) {
    const affectedPaths = filePaths.filter(
      (path) => path === node.id || path.startsWith(`${node.id}/`),
    )
    if (!affectedPaths.length) return
    if (!window.confirm(`Delete ${node.name}? This cannot be undone.`)) return

    setError('')
    setIsMutating(true)
    try {
      await filesApi.remove(runtimeId, affectedPaths)
      onRemove(node.id)
      await onRefresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsMutating(false)
    }
  }

  const treeData = buildFileTree(filePaths)

  function decorateNodes(nodes) {
    return nodes.map((node) => ({
      ...node,
      onOpen,
      onRename: requestRename,
      onDelete: deleteNode,
      ...(node.children ? { children: decorateNodes(node.children) } : {}),
    }))
  }

  function selectedParent() {
    if (!selectedNode) return '/'
    return selectedNode.type === 'folder' ? selectedNode.id : parentPath(selectedNode.id)
  }

  async function submitDialog(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()

    if (!name || name.includes('/') || name === '.' || name === '..') {
      setError('Use a name without slashes.')
      return
    }

    setError('')
    setIsMutating(true)
    try {
      if (dialog.type === 'file') {
        await filesApi.create(runtimeId, { [joinFilePath(selectedParent(), name)]: '' })
      } else if (dialog.type === 'folder') {
        await filesApi.createFolder(runtimeId, joinFilePath(selectedParent(), name))
      } else {
        const destination = joinFilePath(parentPath(dialog.node.id), name)
        if (destination !== dialog.node.id) {
          await filesApi.relocate(runtimeId, dialog.node.id, destination, filePaths)
          onRelocate(dialog.node.id, destination)
        }
      }

      setDialog(null)
      await onRefresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsMutating(false)
    }
  }

  async function moveNode({ dragNodes, parentId }) {
    const node = dragNodes[0]?.data
    if (!node) return
    const destination = joinFilePath(parentId || '/', node.name)
    if (destination === node.id || destination.startsWith(`${node.id}/`)) return

    setError('')
    setIsMutating(true)
    try {
      await filesApi.relocate(runtimeId, node.id, destination, filePaths)
      onRelocate(node.id, destination)
      await onRefresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-white/8 bg-[#17171d]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/8 px-3">
        <span className="text-[10px] font-extrabold uppercase text-zinc-500">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-white/8 hover:text-white"
            type="button"
            onClick={() => setDialog({ type: 'file', initialValue: '' })}
            aria-label="New file"
            title="New file"
          >
            <FilePlus2 className="size-3.5" />
          </button>
          <button
            className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-white/8 hover:text-white"
            type="button"
            onClick={() => setDialog({ type: 'folder', initialValue: '' })}
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>

      <label className="relative mx-2.5 my-2 block shrink-0">
        <Search className="absolute top-2 left-2 size-3.5 text-zinc-600" />
        <input
          className="h-8 w-full rounded border border-white/8 bg-[#111116] pr-8 pl-7 text-xs font-semibold text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-cyan-500/70"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filter files"
          aria-label="Filter files"
        />
        {searchTerm && (
          <button
            type="button"
            className="absolute top-1.5 right-1.5 grid size-5 place-items-center text-zinc-600 hover:text-white"
            onClick={() => setSearchTerm('')}
            aria-label="Clear filter"
            title="Clear filter"
          >
            <X className="size-3" />
          </button>
        )}
      </label>

      {error && <p className="mx-2.5 mb-2 rounded bg-red-500/10 px-2 py-1.5 text-[10px] font-semibold text-red-300">{error}</p>}

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <Tree
          data={decorateNodes(treeData)}
          width={dimensions.width}
          height={dimensions.height}
          rowHeight={28}
          indent={16}
          openByDefault
          disableMultiSelection
          selection={activePath}
          searchTerm={searchTerm}
          onActivate={(node) => {
            if (node.data.type === 'file') onOpen(node.id)
          }}
          onSelect={(nodes) => setSelectedNode(nodes[0]?.data || null)}
          onMove={moveNode}
          aria-label="Project files"
        >
          {FileNode}
        </Tree>
        {isMutating && <div className="absolute inset-0 bg-[#17171d]/45" aria-label="Updating files" />}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={() => setDialog(null)}>
          <form
            className="w-full max-w-sm rounded-md border border-white/10 bg-[#202028] p-5 text-white shadow-2xl"
            onSubmit={submitDialog}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-extrabold">
                {dialog.type === 'rename' ? 'Rename item' : dialog.type === 'folder' ? 'New folder' : 'New file'}
              </h2>
              <button className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-white/8 hover:text-white" type="button" onClick={() => setDialog(null)} aria-label="Close" title="Close">
                <X className="size-4" />
              </button>
            </div>
            <input
              className="mt-5 h-10 w-full rounded border border-white/10 bg-[#111116] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-500"
              name="name"
              defaultValue={dialog.initialValue}
              autoFocus
              required
            />
            <div className="mt-5 flex justify-end gap-2">
              <button className="h-9 rounded px-3 text-xs font-bold text-zinc-400 hover:bg-white/8" type="button" onClick={() => setDialog(null)}>Cancel</button>
              <button className="h-9 rounded bg-cyan-700 px-3 text-xs font-extrabold text-white hover:bg-cyan-600 disabled:opacity-50" type="submit" disabled={isMutating}>Save</button>
            </div>
          </form>
        </div>
      )}
    </aside>
  )
}