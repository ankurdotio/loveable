import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_CONCURRENCY, WORK_FOLDER } from "../config/env.js";
import { isIgnored, runWithConcurrency, toRelativePath } from "../utils/path.util.js";
import { downloadFile, listRemoteFiles, uploadFile } from "./s3.service.js";

/** Walks the work folder, skipping ignored folders entirely. */
export async function listLocalFiles(directory = WORK_FOLDER): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRelativePath(absolutePath);

    if (isIgnored(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...(await listLocalFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Seeds the pod on startup: S3 wins when the project already has files there,
 * otherwise the boilerplate in the work folder is pushed up as the first version.
 */
export async function bootstrap(): Promise<void> {
  const remoteFiles = await listRemoteFiles();

  if (remoteFiles.length > 0) {
    console.log(`[sync] restoring ${remoteFiles.length} files from S3 into ${WORK_FOLDER}`);
    await runWithConcurrency(remoteFiles, UPLOAD_CONCURRENCY, downloadFile);
    return;
  }

  const localFiles = await listLocalFiles();
  console.log(`[sync] S3 is empty, uploading ${localFiles.length} local files`);
  await runWithConcurrency(localFiles, UPLOAD_CONCURRENCY, uploadFile);
}
