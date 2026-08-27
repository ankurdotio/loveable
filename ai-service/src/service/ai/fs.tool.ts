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

// An explicit array of objects: small models produce this far more reliably
// than a free-form path -> content record.
const fileWritesSchema = z
    .array(
        z.object({
            path: z.string().min(1).describe("Project-relative file path, for example app/page.tsx"),
            content: z.string().describe("Complete UTF-8 contents of the file"),
        }),
    )
    .min(1)
    .describe("One entry per file, each with its path and its full contents");

type FileWrite = z.infer<typeof fileWritesSchema>[number];

function toFileMap(files: FileWrite[]): Record<string, string> {
    return Object.fromEntries(files.map(({ path, content }) => [path, content]));
}

function getFileServer(config: ToolRuntime) {
    const podId = config.configurable?.podId;
    if (typeof podId !== "string" || !podId) {
        throw new Error("Pod ID is not configured");
    }

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
        const response = await getFileServer(config).post<FilesResponse>("/files", toFileMap(files));
        return JSON.stringify(response.data.files);
    },
    {
        name: "create_files",
        description:
            "Create one or more files, including parent directories, in the current project. Pass `files` as an array of objects, each with a `path` and the file's complete `content`.",
        schema: z.object({ files: fileWritesSchema }),
    },
);

export const updateFilesTool = tool(
    async ({ files }, config: ToolRuntime): Promise<string> => {
        const response = await getFileServer(config).patch<FilesResponse>("/files", toFileMap(files));
        return JSON.stringify(response.data.files);
    },
    {
        name: "update_files",
        description:
            "Replace the complete contents of one or more existing files in the current project. Pass `files` as an array of objects, each with a `path` and the file's complete `content`. Never pass bare paths.",
        schema: z.object({ files: fileWritesSchema }),
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
