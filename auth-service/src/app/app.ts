/**
 * Express application factory and middleware wiring.
 */
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";

import { createAuthRouter } from "../routes/auth.routes.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";

/**
 * Creates the Express application instance.
 *
 * @returns Configured Express app.
 */
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use(cookieParser());

  app.get("/_status/healthz", (_req, res) => {
    res.status(200).json({ ok: true, service: "auth-service" });
  });
  
  app.get("/_status/healthz", (_req, res) => {
    res.status(200).json({ ok: true, service: "auth-service" });
  });

  app.use("/api/auth", createAuthRouter());
  app.use(errorMiddleware);

  return app;
}
