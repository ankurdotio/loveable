/**
 * Centralized application error handling middleware.
 */
import type { NextFunction, Request, Response } from "express";

/**
 * Application error with a status code and message.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  /**
   * Creates an application error.
   *
   * @param statusCode - HTTP status code to send back to the client.
   * @param message - User-facing error message.
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * Handles application errors and forwards a safe HTTP response.
 *
 * @param err - The thrown error.
 * @param _req - The incoming request.
 * @param res - The Express response object.
 * @param _next - The next middleware function.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({
      message: err.message || "Internal server error",
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
  });
}
