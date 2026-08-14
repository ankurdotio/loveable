/**
 * Mongoose model and schema definition for application users.
 */
import { model, Schema, Types, type InferSchemaType } from "mongoose";

/**
 * Schema definition for persisted user documents.
 */
const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        refreshTokenHash: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

export type UserDocumentType = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User = model<UserDocumentType>("User", userSchema);

export { userSchema };
