/**
 * Environment configuration and fail-fast validation for the auth service.
 */
import dotenv from "dotenv";

dotenv.config();

const requiredEnvKeys = [
  "PORT",
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_EXPIRY",
  "NODE_ENV",
] as const;

export type EnvConfig = {
  PORT: number;
  MONGODB_URI: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  NODE_ENV: "development" | "production" | "test";
};

const getRequiredEnv = (key: (typeof requiredEnvKeys)[number]): string => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env: EnvConfig = {
  PORT: Number.parseInt(getRequiredEnv("PORT"), 10),
  MONGODB_URI: getRequiredEnv("MONGODB_URI"),
  ACCESS_TOKEN_SECRET: getRequiredEnv("ACCESS_TOKEN_SECRET"),
  REFRESH_TOKEN_SECRET: getRequiredEnv("REFRESH_TOKEN_SECRET"),
  ACCESS_TOKEN_EXPIRY: getRequiredEnv("ACCESS_TOKEN_EXPIRY"),
  REFRESH_TOKEN_EXPIRY: getRequiredEnv("REFRESH_TOKEN_EXPIRY"),
  NODE_ENV: (process.env.NODE_ENV ?? "development") as EnvConfig["NODE_ENV"],
};

if (!Number.isInteger(env.PORT) || env.PORT <= 0) {
  throw new Error("PORT must be a positive integer");
}

if (!/^(development|production|test)$/.test(env.NODE_ENV)) {
  throw new Error("NODE_ENV must be one of: development, production, test");
}
