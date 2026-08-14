/**
 * Shared user domain types for the auth service.
 */
import type { InferSchemaType } from "mongoose";

import type { userSchema } from "../models/user.model.js";

/**
 * Mongoose document type for a stored user.
 */
export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: string;
};

/**
 * Public user shape without sensitive auth fields.
 */
export type UserInfo = Pick<UserDocument, "name" | "email"> & {
  id: string;
};

/**
 * Request body for self-registration.
 */
export type RegisterRequestBody = {
  name: string;
  email: string;
  password: string;
};

/**
 * Request body for email/password authentication.
 */
export type LoginRequestBody = {
  email: string;
  password: string;
};

/**
 * Auth payload embedded in access tokens.
 */
export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
};
