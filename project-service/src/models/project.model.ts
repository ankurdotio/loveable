import { Schema, model, type InferSchemaType } from "mongoose"

const projectSchema = new Schema(
    {
        user: {
            type: String,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 120
        },
        status: {
            type: String,
            enum: ["created", "launching", "running", "failed"],
            default: "created",
            required: true
        },
        runtimeId: String,
        previewUrl: String
    },
    {
        timestamps: true,
        versionKey: false
    }
)

projectSchema.index({ user: 1, createdAt: -1 })

export type ProjectDocument = InferSchemaType<typeof projectSchema>

export const Project = model("Project", projectSchema)