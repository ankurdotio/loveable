import { apiRequest } from './client.js'

function runtimePath(runtimeId, path) {
  if (!runtimeId) {
    throw new Error('The project runtime is not available yet.')
  }

  return `/runtime/${encodeURIComponent(runtimeId)}${path}`
}

function normalizePath(value) {
  const path = value.trim().replaceAll('\\', '/').replace(/\/{2,}/g, '/')
  return `/${path.replace(/^\/+|\/+$/g, '')}`
}

function filesQuery(paths) {
  const query = new URLSearchParams({ filenames: paths.join(',') })
  return `?${query.toString()}`
}

async function runtimeRequest(runtimeId, path, options) {
  return apiRequest(runtimePath(runtimeId, path), {
    ...options,
    auth: false,
    headers: {
      ...options?.headers,
      'X-Runtime-Id': runtimeId,
    },
  })
}

export const filesApi = {
  async tree(runtimeId) {
    const response = await runtimeRequest(runtimeId, '/file-tree')
    return response.tree
      .split('\n')
      .map((path) => path.trim())
      .filter(Boolean)
      .map(normalizePath)
  },

  async read(runtimeId, paths) {
    const response = await runtimeRequest(
      runtimeId,
      `/files${filesQuery(paths)}`,
    )
    return response.files
  },

  async create(runtimeId, files) {
    return runtimeRequest(runtimeId, '/files', {
      method: 'POST',
      body: JSON.stringify(files),
    })
  },

  async update(runtimeId, files) {
    return runtimeRequest(runtimeId, '/files', {
      method: 'PATCH',
      body: JSON.stringify(files),
    })
  },

  async remove(runtimeId, paths) {
    return runtimeRequest(runtimeId, `/files${filesQuery(paths)}`, {
      method: 'DELETE',
    })
  },

  createFolder(runtimeId, path) {
    const folderPath = normalizePath(path)
    return this.create(runtimeId, { [`${folderPath}/.gitkeep`]: '' })
  },

  async relocate(runtimeId, sourcePath, destinationPath, allFilePaths) {
    const source = normalizePath(sourcePath)
    const destination = normalizePath(destinationPath)
    const affectedPaths = allFilePaths.filter(
      (path) => path === source || path.startsWith(`${source}/`),
    )

    if (affectedPaths.length === 0) {
      throw new Error(`No files found at ${source}`)
    }

    const currentFiles = await this.read(runtimeId, affectedPaths)
    const relocatedFiles = Object.fromEntries(
      Object.entries(currentFiles).map(([path, content]) => [
        `${destination}${path.slice(source.length)}`,
        content,
      ]),
    )

    await this.create(runtimeId, relocatedFiles)
    await this.remove(runtimeId, affectedPaths)
    return Object.keys(relocatedFiles)
  },
}