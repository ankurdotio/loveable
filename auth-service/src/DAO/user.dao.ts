/**
 * Data access object for user persistence and auth token hashing.
 */
import type { HydratedDocument } from "mongoose";

import { User, type UserDocumentType } from "../models/user.model.js";

export type UserDocumentLike = HydratedDocument<UserDocumentType>;

/**
 * Finds a user by their email address.
 *
 * @param email - User email to search for.
 * @returns Matching user document or null.
 */
export async function findUserByEmail(email: string): Promise<UserDocumentLike | null> {
  return User.findOne({ email: email.toLowerCase() }).exec();
}

/**
 * Finds a user by their unique id.
 *
 * @param userId - Mongo user id.
 * @returns Matching user document or null.
 */
export async function findUserById(userId: string): Promise<UserDocumentLike | null> {
  return User.findById(userId).exec();
}

/**
 * Creates a new user record.
 *
 * @param input - User fields to persist.
 * @returns The created user document.
 */
export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserDocumentLike> {
  return User.create({
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
  });
}

/**
 * Updates a user's refresh-token hash.
 *
 * @param userId - User id whose refresh token hash should be updated.
 * @param refreshTokenHash - Bcrypt hash of the current refresh token.
 */
export async function setRefreshTokenHash(
  userId: string,
  refreshTokenHash: string | null,
): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
}

/**
 * Returns a user with the stored refresh-token hash for verification.
 *
 * @param userId - Unique user id.
 * @returns Matching user document or null.
 */
export async function getUserWithRefreshToken(userId: string): Promise<UserDocumentLike | null> {
  return User.findById(userId).select("refreshTokenHash").exec();
}
