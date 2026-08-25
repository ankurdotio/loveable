import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Blocks,
  Box,
  Clock3,
  FolderCode,
  LogOut,
  Plus,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import { projectsApi } from '../api/projects.js'
import { useAuth } from '../auth/auth-context.js'
import { Brand } from '../components/Brand.jsx'

const statusStyles = {
  created: 'bg-zinc-100 text-zinc-600',
  launching: 'bg-amber-50 text-amber-700',
  running: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
}

function projectId(project) {
  return project._id || project.id
}

function formatDate(value) {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function ProjectsPage() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    projectsApi
      .list()
      .then((items) => {
        if (active) setProjects(items)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function createProject(event) {
    event.preventDefault()
    setError('')
    setIsCreating(true)
    const form = new FormData(event.currentTarget)

    try {
      const project = await projectsApi.create(form.get('title'))
      setProjects((current) => [project, ...current])
      setIsCreateOpen(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="project-page min-h-svh bg-[#f5f6f8] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand compact monochrome />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-extrabold text-zinc-800">{user.name}</p>
              <p className="text-[11px] font-medium text-zinc-400">{user.email}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-cyan-50 text-sm font-extrabold text-cyan-700">
              {user.name?.charAt(0).toUpperCase()}
            </span>
            <button
              className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              type="button"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase text-cyan-700">
              <Blocks className="size-4" />
              Project workspace
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Your projects</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 font-medium text-zinc-500">
              Open a workspace, continue editing, or start something new.
            </p>
          </div>
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-extrabold text-white hover:bg-zinc-800"
            type="button"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" />
            New project
          </button>
        </div>

        {error && (
          <p className="mt-7 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-md border border-zinc-200 bg-white" />
            ))}

          {!isLoading && projects.length === 0 && (
            <button
              className="group col-span-full flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white px-6 text-center hover:border-cyan-400 hover:bg-cyan-50/50"
              type="button"
              onClick={() => setIsCreateOpen(true)}
            >
              <span className="mb-5 grid size-12 place-items-center rounded-md bg-cyan-50 text-cyan-700">
                <FolderCode className="size-6" />
              </span>
              <span className="text-lg font-extrabold">Create your first project</span>
              <span className="mt-2 text-sm font-medium text-zinc-500">A fresh workspace is one step away.</span>
            </button>
          )}

          {projects.map((project) => (
            <Link
              className="group flex min-h-56 flex-col rounded-md border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_35px_rgba(23,23,23,0.08)]"
              key={projectId(project)}
              to={`/projects/${projectId(project)}`}
              state={{ project }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-md bg-zinc-950 text-white">
                  <Box className="size-5" />
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusStyles[project.status] || statusStyles.created}`}>
                  {project.status || 'created'}
                </span>
              </div>
              <h2 className="mt-6 truncate text-lg font-extrabold">{project.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
                <Clock3 className="size-3.5" />
                Updated {formatDate(project.updatedAt)}
              </p>
              <span className="mt-auto flex items-center gap-2 pt-7 text-xs font-extrabold text-zinc-700 group-hover:text-cyan-700">
                Open workspace
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 p-5 backdrop-blur-sm" role="presentation" onMouseDown={() => setIsCreateOpen(false)}>
          <form
            className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl"
            onSubmit={createProject}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">Create a project</h2>
                <p className="mt-2 text-sm font-medium text-zinc-500">Give this workspace a clear name.</p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-extrabold text-zinc-700">Project name</span>
              <input
                className="h-11 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10"
                name="title"
                maxLength={120}
                placeholder="Customer portal"
                autoFocus
                required
              />
            </label>
            <div className="mt-7 flex justify-end gap-3">
              <button className="h-10 rounded-md px-4 text-sm font-bold text-zinc-600 hover:bg-zinc-100" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="h-10 rounded-md bg-cyan-700 px-4 text-sm font-extrabold text-white hover:bg-cyan-800 disabled:opacity-60" type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}