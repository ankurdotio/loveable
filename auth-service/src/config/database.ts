/**
 * MongoDB connection helpers for the auth service.
 */
import mongoose from "mongoose";

import { env } from "./env.js";

/**
 * Connects to MongoDB using the configured connection URI.
 *
 * @returns A promise resolving to the connected Mongoose instance.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected");
    return mongoose;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MongoDB connection error";
    throw new Error(`MongoDB connection failed: ${message}`);
  }
}
