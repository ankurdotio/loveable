import mongoose from 'mongoose';
import type { InferSchemaType } from 'mongoose';


const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        ref: 'Conversation'
    },
    content: {
        type: String
    },
    author: {
        type: String,
        enum: ["user", "ai", "tool"],
        default: "user"
    },
    toolCalls: [
        {
            arguments: Object,
            id: String,
            name: String,
        }
    ],
    toolCallId: String,
}, {
    timestamps: true
})

export type Message = InferSchemaType<typeof messageSchema> & {
    _id: mongoose.Types.ObjectId;
}

export const MessageModel = mongoose.model<Message>('Message', messageSchema);