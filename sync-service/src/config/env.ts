import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
}

export const PROJECT_ID = required("PROJECT_ID");

export const WORK_FOLDER = path.resolve(process.env.WORK_FOLDER ?? "/app");

export const S3_BUCKET = process.env.S3_BUCKET ?? "pienapple";
export const S3_REGION = process.env.AWS_REGION ?? "ap-southeast-1";
export const S3_PREFIX = `projects/${PROJECT_ID}/`;

export const AWS_ACCESS_KEY_ID = required("AWS_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY = required("AWS_SECRET_ACCESS_KEY");

/** How long the watcher waits for silence before flushing a batch of changes. */
export const FLUSH_DEBOUNCE_MS = Number(process.env.FLUSH_DEBOUNCE_MS ?? 1000);

/** Upper bound on how long a busy folder can delay a flush. */
export const FLUSH_MAX_WAIT_MS = Number(process.env.FLUSH_MAX_WAIT_MS ?? 5000);

/** Parallel S3 requests per batch. */
export const UPLOAD_CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY ?? 5);

/** Files bigger than this are skipped so the sync never buffers huge blobs. */
export const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES ?? 5 * 1024 * 1024);

/** Cap on queued paths; protects memory when a build writes thousands of files. */
export const MAX_PENDING_CHANGES = Number(process.env.MAX_PENDING_CHANGES ?? 5000);

export const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".cache",
  ".vercel",
]);

export const IGNORED_FILES = new Set([
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "npm-debug.log",
  "yarn-error.log",
]);
