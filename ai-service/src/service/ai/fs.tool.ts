import axios from "axios";
import { tool } from "langchain";
import type { ToolRuntime } from "langchain";
import * as z from "zod";

interface FileTreeResponse {
    tree: string;
}

interface FilesResponse {
    files: Record<string, string> | string[];
}

const filenamesSchema = z.array(z.string().min(1)).min(1).describe("Project-relative file paths");
const filesSchema = z.record(z.string().min(1), z.string()).refine(
    (files) => Object.keys(files).length > 0,
    "At least one file is required",
);

function getFileServer(config: ToolRuntime) {
    const podId = config.configurable?.podId;
    if (typeof podId !== "string" || !podId) {
        throw new Error("Pod ID is not configured");
    }

    const baseUrl = `http://nextjs-service-${podId}`;

    return axios.create({
        baseURL: `http://nextjs-service-${podId}:8000`,
    });
}

async function getFilesTree(_input: Record<string, never>, config: ToolRuntime): Promise<string> {
    const response = await getFileServer(config).get<FileTreeResponse>("/file-tree");
    return response.data.tree;
}

export const getFilesTreeTool = tool(
    getFilesTree,
    {
        name: "get_file_tree",
        description: "List all files in the current project. Use this before reading files when their paths are unknown.",
        schema: z.object({}),
    },
);

export const getFilesTool = tool(
    async ({ filenames }, config: ToolRuntime): Promise<string> => {
        const response = await getFileServer(config).get<FilesResponse>("/files", {
            params: { filenames: filenames.join(",") },
        });
        return JSON.stringify(response.data.files);
    },
    {
        name: "get_files",
        description: "Read the UTF-8 contents of one or more files in the current project.",
        schema: z.object({ filenames: filenamesSchema }),
    },
);

export const createFilesTool = tool(
    async ({ files }, config: ToolRuntime): Promise<string> => {
        const response = await getFileServer(config).post<FilesResponse>("/files", files);
        return JSON.stringify(response.data.files);
    },
    {
        name: "create_files",
        description: "Create one or more files, including parent directories, in the current project.",
        schema: z.object({ files: filesSchema }),
    },
);

export const updateFilesTool = tool(
    async ({ files }, config: ToolRuntime): Promise<string> => {
        const response = await getFileServer(config).patch<FilesResponse>("/files", files);
        return JSON.stringify(response.data.files);
    },
    {
        name: "update_files",
        description: "Replace the complete contents of one or more existing files in the current project.",
        schema: z.object({ files: filesSchema }),
    },
);

export const removeFilesTool = tool(
    async ({ filenames }, config: ToolRuntime): Promise<string> => {
        const response = await getFileServer(config).delete<FilesResponse>("/files", {
            params: { filenames: filenames.join(",") },
        });
        return JSON.stringify(response.data.files);
    },
    {
        name: "remove_files",
        description: "Permanently delete one or more files or directories from the current project.",
        schema: z.object({ filenames: filenamesSchema }),
    },
);

export const fileTools = [
    getFilesTreeTool,
    getFilesTool,
    createFilesTool,
    updateFilesTool,
    removeFilesTool,
];
