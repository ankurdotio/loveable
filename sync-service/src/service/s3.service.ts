import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { MAX_FILE_BYTES, S3_BUCKET, S3_PREFIX } from "../config/env.js";
import { s3 } from "../config/s3.js";
import { toAbsolutePath, isIgnored, toObjectKey, toRelativeFromKey } from "../utils/path.util.js";

/** Lists every work-folder-relative path stored under this project's prefix. */
export async function listRemoteFiles(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: S3_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      keys.push(toRelativeFromKey(object.Key));
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function uploadFile(relativePath: string): Promise<void> {
  if (isIgnored(relativePath)) return;

  const absolutePath = toAbsolutePath(relativePath);

  let stats; 
  try {
    stats = await fs.stat(absolutePath);
  } catch {
    return; // Removed between the event and the flush.
  }

  if (!stats.isFile()) return;

  if (stats.size > MAX_FILE_BYTES) {
    console.warn(`[sync] skipping ${relativePath}: ${stats.size} bytes exceeds limit`);
    return;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: toObjectKey(relativePath),
      Body: await fs.readFile(absolutePath),
    }),
  );
}

export async function downloadFile(relativePath: string): Promise<void> {
  const absolutePath = toAbsolutePath(relativePath);

  const response = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: toObjectKey(relativePath) }),
  );

  if (!response.Body) return;

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, await response.Body.transformToByteArray());
}

export async function deleteFiles(relativePaths: string[]): Promise<void> {
  if (relativePaths.length === 0) return;

  // DeleteObjects accepts at most 1000 keys per request.
  for (let index = 0; index < relativePaths.length; index += 1000) {
    const chunk = relativePaths.slice(index, index + 1000);

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: chunk.map((relativePath) => ({ Key: toObjectKey(relativePath) })) },
      }),
    );
  }
}
