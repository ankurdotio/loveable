/**
 * Route definitions for auth endpoints.
 */
import { Router } from "express";

import { login, logout, me, refresh, register } from "../controller/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

/**
 * Creates and configures the auth router.
 *
 * @returns Configured Express router for auth routes.
 */
export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /api/auth/register
   * Request body: { name: string, email: string, password: string }
   * Response: { user: { id, name, email }, accessToken: string, refreshToken: string }
   */
  router.post("/register", register);

  /**
   * POST /api/auth/login
   * Request body: { email: string, password: string }
   * Response: { user: { id, name, email }, accessToken: string, refreshToken: string }
   */
  router.post("/login", login);

  /**
   * POST /api/auth/refresh
   * Request body: none (expects refreshToken cookie)
   * Response: { user: { id, name, email }, accessToken: string, refreshToken: string }
   */
  router.post("/refresh", refresh);

  /**
   * POST /api/auth/logout
   * Request body: none
   * Response: { message: string }
   */
  router.post("/logout", logout);

  /**
   * GET /api/auth/me
   * Request body: none
   * Response: { id: string, name: string, email: string }
   */
  router.get("/me", authenticate, me);

  return router;
}
