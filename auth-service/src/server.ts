/**
 * Server bootstrapper for the auth service.
 */
import { createApp } from "./app/app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const app = createApp();

async function startServer(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Auth service listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down server`);
    server.close(async () => {
      try {
        await import("mongoose").then(({ default: mongoose }) => mongoose.disconnect());
        console.log("MongoDB disconnected");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void startServer();
