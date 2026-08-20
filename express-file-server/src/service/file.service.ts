import fs from "node:fs/promises";
import path from "node:path";
import { IGNORED_DIRS, IGNORED_FILES, WORK_FOLDER } from "../config/env.js";
import { HttpError, toAbsolutePath, toApiPath } from "../utils/path.util.js";

export async function getFileTree(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(absolute);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        files.push(toApiPath(absolute));
      }
    }
  }

  await walk(WORK_FOLDER);
  return files.sort();
}

export async function readFiles(filenames: string[]): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};

  await Promise.all(
    filenames.map(async (filename) => {
      const absolute = toAbsolutePath(filename);
      try {
        contents[filename] = await fs.readFile(absolute, "utf8");
      } catch {
        throw new HttpError(404, `File not found: ${filename}`);
      }
    }),
  );

  return contents;
}

export async function writeFiles(payload: Record<string, string>): Promise<string[]> {
  const entries = Object.entries(payload);

  if (entries.length === 0) {
    throw new HttpError(400, "Request body must contain at least one file");
  }

  await Promise.all(
    entries.map(async ([filename, content]) => {
      if (typeof content !== "string") {
        throw new HttpError(400, `Content for ${filename} must be a string`);
      }
      const absolute = toAbsolutePath(filename);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content, "utf8");
    }),
  );

  return entries.map(([filename]) => filename);
}

export async function deleteFiles(filenames: string[]): Promise<string[]> {
  await Promise.all(
    filenames.map(async (filename) => {
      const absolute = toAbsolutePath(filename);
      try {
        await fs.rm(absolute, { recursive: true, force: false });
      } catch {
        throw new HttpError(404, `File not found: ${filename}`);
      }
    }),
  );

  return filenames;
}
