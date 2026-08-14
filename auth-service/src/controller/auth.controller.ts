/**
 * Express controllers for auth endpoints.
 */
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { createUser, findUserByEmail, findUserById, setRefreshTokenHash } from "../DAO/user.dao.js";
import { AppError } from "../middlewares/error.middleware.js";
import type { AuthTokenPayload, LoginRequestBody, RegisterRequestBody, UserInfo } from "../types/user.js";
import { getRefreshTokenCookieOptions } from "../utils/token.util.js";

const SALT_ROUNDS = 10;

/**
 * Signs a JWT with a typed secret and expiry value.
 *
 * @param payload - JWT payload to sign.
 * @param secret - Secret used to sign the token.
 * @param expiresIn - Time-to-live string value.
 * @returns Signed JWT string.
 */
function signToken(payload: AuthTokenPayload, secret: Secret, expiresIn: string): string {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

/**
 * Validates a trimmed email string with a simple format check.
 *
 * @param value - Raw value to validate.
 * @returns True when the value is a valid email address.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Validates a required string field.
 *
 * @param value - Input value to validate.
 * @param fieldName - Field name used for errors.
 * @returns A trimmed string or throws an error.
 */
function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new AppError(400, `${fieldName} is required.`);
  }

  return trimmed;
}

/**
 * Builds a response payload with access and refresh tokens for auth responses.
 *
 * @param res - Express response instance.
 * @param user - Authenticated user payload.
 */
function issueTokens(res: Response, user: { id: string; email: string; name: string }): void {
  const accessToken = signToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    env.ACCESS_TOKEN_SECRET,
    env.ACCESS_TOKEN_EXPIRY,
  );

  const refreshToken = signToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    env.REFRESH_TOKEN_SECRET,
    env.REFRESH_TOKEN_EXPIRY,
  );

  res.setHeader("Authorization", `Bearer ${accessToken}`);
  res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  });
}

/**
 * Registers a new user and issues both tokens.
 *
 * @route POST /api/auth/register
 * @param req - Incoming request containing name, email, and password.
 * @param res - Express response.
 * @param next - Error middleware callback.
 */
export async function register(
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = validateRequiredString(req.body?.name, "name");
    const email = validateRequiredString(req.body?.email, "email");
    const password = validateRequiredString(req.body?.password, "password");

    if (name.length < 2) {
      throw new AppError(400, "name must be at least 2 characters long.");
    }

    if (!isValidEmail(email)) {
      throw new AppError(400, "Invalid email format.");
    }

    if (password.length < 8) {
      throw new AppError(400, "password must be at least 8 characters long.");
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new AppError(409, "Email already registered.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    const accessToken = signToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
      },
      env.ACCESS_TOKEN_SECRET,
      env.ACCESS_TOKEN_EXPIRY,
    );

    const refreshToken = signToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
      },
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRY,
    );

    await setRefreshTokenHash(safeUser.id, bcrypt.hashSync(refreshToken, SALT_ROUNDS));

    res.setHeader("Authorization", `Bearer ${accessToken}`);
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
    res.status(201).json({
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticates an existing user and issues both tokens.
 *
 * @route POST /api/auth/login
 * @param req - Incoming request containing email and password.
 * @param res - Express response.
 * @param next - Error middleware callback.
 */
export async function login(
  req: Request<{}, {}, LoginRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = validateRequiredString(req.body?.email, "email");
    const password = validateRequiredString(req.body?.password, "password");

    if (!isValidEmail(email)) {
      throw new AppError(400, "Invalid email format.");
    }

    if (password.length < 8) {
      throw new AppError(400, "password must be at least 8 characters long.");
    }

    const user = await findUserByEmail(email);
    if (!user) {
      throw new AppError(401, "Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password.");
    }

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    const accessToken = signToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
      },
      env.ACCESS_TOKEN_SECRET,
      env.ACCESS_TOKEN_EXPIRY,
    );

    const refreshToken = signToken(
      {
        sub: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
      },
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRY,
    );

    await setRefreshTokenHash(safeUser.id, bcrypt.hashSync(refreshToken, SALT_ROUNDS));

    res.setHeader("Authorization", `Bearer ${accessToken}`);
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
    res.status(200).json({
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refreshes the access token using an HTTP-only refresh cookie.
 *
 * @route POST /api/auth/refresh
 * @param req - Incoming request containing the refresh token cookie.
 * @param res - Express response.
 * @param next - Error middleware callback.
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new AppError(401, "Refresh token missing.");
    }

    const decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!decoded.sub) {
      throw new AppError(401, "Invalid refresh token.");
    }

    const user = await findUserById(decoded.sub);
    if (!user) {
      throw new AppError(401, "Invalid refresh token.");
    }

    const isRefreshTokenValid = user.refreshTokenHash
      ? await bcrypt.compare(refreshToken, user.refreshTokenHash)
      : false;

    if (!isRefreshTokenValid) {
      throw new AppError(401, "Refresh token invalid or revoked.");
    }

    const accessToken = signToken(
      {
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      env.ACCESS_TOKEN_SECRET,
      env.ACCESS_TOKEN_EXPIRY,
    );

    const rotatedRefreshToken = signToken(
      {
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRY,
    );

    const newRefreshTokenHash = bcrypt.hashSync(rotatedRefreshToken, SALT_ROUNDS);
    await setRefreshTokenHash(user._id.toString(), newRefreshTokenHash);

    res.setHeader("Authorization", `Bearer ${accessToken}`);
    res.cookie("refreshToken", rotatedRefreshToken, getRefreshTokenCookieOptions());
    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken: rotatedRefreshToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logs the user out and clears the refresh token state.
 *
 * @route POST /api/auth/logout
 * @param req - Incoming request containing the refresh token cookie.
 * @param res - Express response.
 * @param next - Error middleware callback.
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { sub?: string };
        if (decoded.sub) {
          await setRefreshTokenHash(decoded.sub, null);
        }
      } catch {
        // Ignore malformed/expired refresh token and still clear cookie.
      }
    }

    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the current authenticated user profile.
 *
 * @route GET /api/auth/me
 * @param req - Incoming request with authenticated user attached.
 * @param res - Express response.
 * @param next - Error middleware callback.
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthenticated.");
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      throw new AppError(401, "User not found.");
    }

    const payload: UserInfo = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}
