import { apiRequest } from './client.js'

export const projectsApi = {
    async list() {
        const response = await apiRequest('/api/projects')
        return response.projects
    },

    async create(title) {
        const response = await apiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ title }),
        })
        return response.project
    },

    async launch(projectId) {
        const response = await apiRequest(`/api/projects/${projectId}/launch`, {
            method: 'POST',
        })
        return response.project
    },
}