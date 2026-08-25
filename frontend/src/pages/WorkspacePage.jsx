import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Code2, Eye, LoaderCircle, RotateCcw } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { filesApi } from '../api/files.js'
import { projectsApi } from '../api/projects.js'
import { Brand } from '../components/Brand.jsx'
import { ChatPanel } from '../components/workspace/ChatPanel.jsx'
import { CodeEditorPane } from '../components/workspace/CodeEditorPane.jsx'
import { FileExplorer } from '../components/workspace/FileExplorer.jsx'
import { PreviewPane } from '../components/workspace/PreviewPane.jsx'

function entityId(entity) {
  return entity?._id || entity?.id
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

export function WorkspacePage() {
  const { projectId } = useParams()
  const location = useLocation()
  const launchPromise = useRef(null)
  const initialProject = entityId(location.state?.project) === projectId
    ? location.state.project
    : null
  const [project, setProject] = useState(initialProject)
  const [isStarting, setIsStarting] = useState(!initialProject?.runtimeId)
  const [startupError, setStartupError] = useState('')
  const [filePaths, setFilePaths] = useState([])
  const [fileError, setFileError] = useState('')
  const [tabs, setTabs] = useState([])
  const [activePath, setActivePath] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mode, setMode] = useState('code')
  const runtimeId = project?.runtimeId

  useEffect(() => {
    let active = true

    async function findProject() {
      if (initialProject) return initialProject
      const projects = await projectsApi.list()
      return projects.find((item) => entityId(item) === projectId)
    }

    async function waitForRunningProject(currentProject) {
      let latestProject = currentProject

      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (latestProject?.runtimeId) return latestProject
        if (latestProject?.status === 'failed') {
          throw new Error('The project runtime failed to start.')
        }

        await wait(2000)
        const projects = await projectsApi.list()
        latestProject = projects.find((item) => entityId(item) === projectId)
        if (active && latestProject) setProject(latestProject)
      }

      throw new Error('The project runtime took too long to start.')
    }

    async function prepareWorkspace() {
      setStartupError('')
      setIsStarting(true)

      try {
        let currentProject = await findProject()
        if (!currentProject) throw new Error('Project not found.')
        if (active) setProject(currentProject)

        if (!currentProject.runtimeId) {
          if (['created', 'failed'].includes(currentProject.status)) {
            launchPromise.current ??= projectsApi.launch(projectId)
            currentProject = await launchPromise.current
          } else {
            currentProject = await waitForRunningProject(currentProject)
          }
        }

        if (active) setProject(currentProject)
      } catch (requestError) {
        if (active) setStartupError(requestError.message)
      } finally {
        if (active) setIsStarting(false)
      }
    }

    prepareWorkspace()
    return () => {
      active = false
    }
  }, [initialProject, projectId])

  useEffect(() => {
    if (!runtimeId) return undefined
    let active = true

    filesApi
      .tree(runtimeId)
      .then((paths) => {
        if (active) setFilePaths(paths)
      })
      .catch((requestError) => {
        if (active) setFileError(requestError.message)
      })

    return () => {
      active = false
    }
  }, [runtimeId])

  async function refreshFiles() {
    if (!runtimeId) return
    setFileError('')
    try {
      setFilePaths(await filesApi.tree(runtimeId))
    } catch (requestError) {
      setFileError(requestError.message)
    }
  }

  async function openFile(path) {
    setActivePath(path)
    if (tabs.some((tab) => tab.path === path) || !runtimeId) return

    try {
      const files = await filesApi.read(runtimeId, [path])
      setTabs((current) =>
        current.some((tab) => tab.path === path)
          ? current
          : [...current, { path, content: files[path] || '', isDirty: false }],
      )
    } catch (requestError) {
      setFileError(requestError.message)
    }
  }

  function changeFile(path, content) {
    setTabs((current) =>
      current.map((tab) =>
        tab.path === path ? { ...tab, content, isDirty: true } : tab,
      ),
    )
  }

  async function saveFile(path) {
    const tab = tabs.find((item) => item.path === path)
    if (!tab || !runtimeId || !tab.isDirty) return

    setIsSaving(true)
    setFileError('')
    try {
      await filesApi.update(runtimeId, { [path]: tab.content })
      setTabs((current) =>
        current.map((item) =>
          item.path === path ? { ...item, isDirty: false } : item,
        ),
      )
    } catch (requestError) {
      setFileError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function closeFile(path) {
    const tab = tabs.find((item) => item.path === path)
    if (tab?.isDirty && !window.confirm(`Close ${path} without saving?`)) return

    const nextTabs = tabs.filter((item) => item.path !== path)
    setTabs(nextTabs)
    if (activePath === path) {
      setActivePath(nextTabs.at(-1)?.path || null)
    }
  }

  function relocateOpenPaths(source, destination) {
    setTabs((current) =>
      current.map((tab) =>
        tab.path === source || tab.path.startsWith(`${source}/`)
          ? { ...tab, path: `${destination}${tab.path.slice(source.length)}` }
          : tab,
      ),
    )
    setActivePath((current) =>
      current && (current === source || current.startsWith(`${source}/`))
        ? `${destination}${current.slice(source.length)}`
        : current,
    )
  }

  function removeOpenPaths(source) {
    setTabs((current) =>
      current.filter(
        (tab) => tab.path !== source && !tab.path.startsWith(`${source}/`),
      ),
    )
    setActivePath((current) =>
      current && (current === source || current.startsWith(`${source}/`))
        ? null
        : current,
    )
  }

  if (isStarting) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#111116] text-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-5 size-7 animate-spin text-cyan-400" />
          <p className="text-sm font-extrabold">Starting {project?.title || 'your workspace'}</p>
          <p className="mt-2 text-xs font-medium text-zinc-600">Provisioning the project runtime</p>
        </div>
      </main>
    )
  }

  if (startupError || !project) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#111116] px-5 text-center text-white">
        <div>
          <p className="text-lg font-extrabold">Workspace unavailable</p>
          <p className="mt-2 text-sm font-medium text-zinc-500">{startupError || 'Project not found.'}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link className="flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-zinc-300 hover:bg-white/5" to="/projects">
              <ArrowLeft className="size-3.5" /> Projects
            </Link>
            <button className="flex h-9 items-center gap-2 rounded bg-cyan-700 px-3 text-xs font-extrabold hover:bg-cyan-600" type="button" onClick={() => window.location.reload()}>
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  const previewUrl = project.previewUrl || (runtimeId ? `http://${runtimeId}.preview.localhost` : '')
  const modeControl = (
    <button
      className="flex h-9 items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-700 px-2.5 text-[10px] font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:bg-cyan-600"
      type="button"
      onClick={() => setMode((current) => (current === 'code' ? 'preview' : 'code'))}
      title={mode === 'code' ? 'Show preview' : 'Show code'}
    >
      {mode === 'code' ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
      {mode === 'code' ? 'Preview' : 'Code'}
    </button>
  )

  return (
    <main className="workspace-shell h-svh overflow-hidden bg-[#111116] text-white">
      <header className="flex h-13 items-center justify-between border-b border-white/8 bg-[#17171d] px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link className="grid size-8 shrink-0 place-items-center rounded text-zinc-500 hover:bg-white/5 hover:text-white" to="/projects" aria-label="Back to projects" title="Back to projects">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="hidden border-r border-white/8 pr-4 sm:block">
            <Brand compact inverse monochrome />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xs font-extrabold text-zinc-200">{project.title}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Runtime active
            </p>
          </div>
        </div>
        {fileError && (
          <button className="flex max-w-64 items-center gap-2 truncate rounded bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-300" type="button" onClick={refreshFiles} title={fileError}>
            <RotateCcw className="size-3 shrink-0" />
            <span className="truncate">File service unavailable</span>
          </button>
        )}
      </header>

      <div className="workspace-grid h-[calc(100svh-52px)]">
        <div className="min-h-0 min-w-0">
          {mode === 'code' ? (
            <div className="workspace-code-grid h-full">
              <FileExplorer
                runtimeId={runtimeId}
                filePaths={filePaths}
                activePath={activePath}
                onOpen={openFile}
                onRefresh={refreshFiles}
                onRelocate={relocateOpenPaths}
                onRemove={removeOpenPaths}
              />
              <CodeEditorPane
                tabs={tabs}
                activePath={activePath}
                onSelect={setActivePath}
                onClose={closeFile}
                onChange={changeFile}
                onSave={saveFile}
                isSaving={isSaving}
              />
            </div>
          ) : (
            <PreviewPane previewUrl={previewUrl} />
          )}
        </div>
        <ChatPanel projectId={projectId} modeControl={modeControl} />
      </div>
    </main>
  )
}