/**
 * Token and cookie helper utilities for authentication flows.
 */
import type { CookieOptions } from "express";

import { env } from "../config/env.js";

/**
 * Converts a JWT duration string such as 15m or 7d to milliseconds.
 *
 * @param value - A duration string.
 * @returns Milliseconds matching the duration value.
 */
export function getExpiryMilliseconds(value: string): number {
  const match = /^([0-9]+)(ms|s|m|h|d)$/i.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid expiry value: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

/**
 * Builds the standard refresh-token cookie options used by the service.
 *
 * @returns Cookie configuration for the refresh token cookie.
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: getExpiryMilliseconds(env.REFRESH_TOKEN_EXPIRY),
  };
}

/**
 * Builds a cookie configuration for clearing the refresh token.
 *
 * @returns Cookie configuration to expire the refresh token.
 */
export function getExpiredRefreshTokenCookieOptions(): CookieOptions {
  return {
    ...getRefreshTokenCookieOptions(),
    maxAge: 0,
  };
}
