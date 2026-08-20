import path from "node:path";

export const PORT = Number(process.env.PORT ?? 8080);

export const WORK_FOLDER = path.resolve(process.env.WORK_FOLDER ?? "/app");

export const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".git",
  ".turbo",
  "coverage",
]);

export const IGNORED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".DS_Store",
]);
