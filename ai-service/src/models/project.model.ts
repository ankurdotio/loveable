import mongoose from 'mongoose';
import type { InferSchemaType } from 'mongoose';

const projectSchema = new mongoose.Schema({
    context: { type: String, default: "" },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
    }
}, {
    timestamps: true,
})

export type Project = InferSchemaType<typeof projectSchema>;

export const ProjectModel = mongoose.model<Project>('Project', projectSchema);