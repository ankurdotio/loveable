import mongoose from 'mongoose';
import type { InferSchemaType } from 'mongoose';

const conversationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
    }
}, {
    timestamps: true,
})

export type Conversation = InferSchemaType<typeof conversationSchema>;

export const ConversationModel = mongoose.model<Conversation>('Conversation', conversationSchema);