const languageByExtension = {
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    go: 'go',
    html: 'html',
    java: 'java',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    scss: 'scss',
    sh: 'shell',
    sql: 'sql',
    ts: 'typescript',
    tsx: 'typescript',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
}

export function normalizeFilePath(value) {
    const normalized = value.trim().replaceAll('\\', '/').replace(/\/{2,}/g, '/')
    return `/${normalized.replace(/^\/+|\/+$/g, '')}`
}

export function parentPath(value) {
    const path = normalizeFilePath(value)
    const separatorIndex = path.lastIndexOf('/')
    return separatorIndex <= 0 ? '/' : path.slice(0, separatorIndex)
}

export function joinFilePath(parent, name) {
    return normalizeFilePath(`${parent}/${name}`)
}

export function languageForPath(path) {
    const extension = path.split('.').pop()?.toLowerCase()
    return languageByExtension[ extension ] || 'plaintext'
}

export function buildFileTree(paths) {
    const root = []

    for (const rawPath of paths) {
        const path = normalizeFilePath(rawPath)
        const segments = path.slice(1).split('/').filter(Boolean)
        let siblings = root
        let currentPath = ''

        segments.forEach((name, index) => {
            const isFile = index === segments.length - 1
            currentPath = `${currentPath}/${name}`

            if (isFile && name === '.gitkeep') return

            let node = siblings.find((item) => item.id === currentPath)

            if (!node) {
                node = {
                    id: currentPath,
                    name,
                    type: isFile ? 'file' : 'folder',
                    ...(isFile ? {} : { children: [] }),
                }
                siblings.push(node)
            }

            if (!isFile) siblings = node.children
        })
    }

    function sortNodes(nodes) {
        nodes.sort((left, right) => {
            if (left.type !== right.type) return left.type === 'folder' ? -1 : 1
            return left.name.localeCompare(right.name)
        })
        nodes.forEach((node) => {
            if (node.children) sortNodes(node.children)
        })
    }

    sortNodes(root)
    return root
}