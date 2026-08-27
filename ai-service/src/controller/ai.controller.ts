import { MessageModel } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { ProjectModel } from "../models/project.model.js";
import type { NextFunction, Request, Response } from "express";
import { getConversationTitle } from "../service/ai/ai.service.js";
import { handleUserMessage } from "../service/ai/ai.service.js";
import { HumanMessage, AIMessage, ToolMessage, AIMessageChunk } from "langchain";
import { AppError } from "../middlewares/error.middleware.js";

/** Resolves the ai-service project record the caller is allowed to use. */
async function requireProject(userId: string, projectId: unknown) {
    if (typeof projectId !== "string" || !projectId.trim()) {
        throw new AppError(400, "projectId is required");
    }

    const project = await ProjectModel.findOne({ projectId, userId }).catch(() => null);

    if (!project) {
        throw new AppError(404, "Project not found");
    }

    return project;
}

/** Resolves a conversation the caller owns. */
async function requireConversation(userId: string, conversationId: string) {
    const conversation = await ConversationModel.findById(conversationId).catch(() => null);

    if (!conversation || conversation.user?.toString() !== userId) {
        throw new AppError(404, "Conversation not found");
    }

    return conversation;
}

/**
 * GET /api/ai/projects/:projectId/conversations
 */
export async function listConversationsController(req: Request, res: Response, next: NextFunction) {
    try {
        const project = await requireProject(req.user!.id, req.params.projectId);

        const conversations = await ConversationModel.find({
            project: project.id,
            user: req.user!.id
        }).sort({ updatedAt: -1 });

        res.json({
            conversations: conversations.map(conversation => ({
                _id: conversation.id,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt
            }))
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/ai/projects/:projectId/conversations
 * req.body = { title?: string }
 */
export async function createConversationController(req: Request, res: Response, next: NextFunction) {
    try {
        const project = await requireProject(req.user!.id, req.params.projectId);
        const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";

        const conversation = await ConversationModel.create({
            title: title || "New conversation",
            project: project.id,
            user: req.user!.id
        });

        res.status(201).json({
            conversation: {
                _id: conversation.id,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/ai/conversations/:conversationId/messages
 *
 * Only user prompts and assistant prose are returned; tool calls and tool
 * results are internal agent bookkeeping and never reach the client.
 */
export async function listMessagesController(req: Request, res: Response, next: NextFunction) {
    try {
        const conversation = await requireConversation(req.user!.id, String(req.params.conversationId));

        const messages = await MessageModel.find({
            conversationId: conversation.id,
            author: { $in: ["user", "ai"] }
        }).sort({ createdAt: 1 });

        res.json({
            conversation: { _id: conversation.id, title: conversation.title },
            messages: messages
                .filter(message => (message.content || "").trim().length > 0)
                .map(message => ({
                    _id: message.id,
                    author: message.author,
                    content: message.content || "",
                    createdAt: message.createdAt
                }))
        });
    } catch (error) {
        next(error);
    }
}

/** Writes one JSON-encoded SSE event. */
function sendEvent(res: Response, payload: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Turns transport/model failures into something a user can act on. */
function errorMessage(error: unknown) {
    if (error instanceof AppError) return error.message;

    const raw = error instanceof Error ? error.message : String(error);

    if (/timeout|ETIMEDOUT|ESOCKETTIMEDOUT|AbortError/i.test(raw)) {
        return "The AI request timed out. Please try again.";
    }

    if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up/i.test(raw)) {
        return "Could not reach your project runtime. Make sure the preview is running and try again.";
    }

    if (/rate.?limit|\b429\b/i.test(raw)) {
        return "The AI model is rate limited right now. Please retry in a few moments.";
    }

    return raw || "The AI service failed to complete this request.";
}

/**
 * POST /api/ai/message
 * req.body = { content: string, conversationId?: string, projectId: string }
 *
 * Streams SSE events shaped as `{ type: "meta" | "token" | "done" | "error" }`.
 */
export async function handleMessageController(req: Request, res: Response, next: NextFunction) {
    let conversation = null;

    try {
        const user = req.user!;
        const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

        if (!content) {
            throw new AppError(400, "content is required");
        }

        const project = await requireProject(user.id, req.body?.projectId);

        if (req.body.conversationId) {
            conversation = await requireConversation(user.id, req.body.conversationId);

            if (conversation.project?.toString() !== project.id) {
                throw new AppError(403, "Conversation does not belong to the project");
            }
        } else {
            const title = await getConversationTitle(content).catch(() => content.slice(0, 60));

            conversation = await ConversationModel.create({
                title,
                project: project.id,
                user: user.id
            });
        }

        // ––––––––––––––––––– SSE headers –––––––––––––––––––
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        sendEvent(res, {
            type: "meta",
            conversationId: conversation.id,
            title: conversation.title
        });

        await MessageModel.create({
            conversationId: conversation.id,
            author: "user",
            content,
            toolCalls: []
        });

        const history = await MessageModel.find({ conversationId: conversation.id }).sort({ createdAt: 1 });

        const stream = await handleUserMessage(
            history.map(message => {
                if (message.author === "user") {
                    return new HumanMessage(message.content || "")
                }
                if (message.author === "ai") {
                    return new AIMessage({
                        content: message.content || "",
                        tool_calls: message.toolCalls?.map(toolCall => {
                            return {
                                id: toolCall.id || "",
                                name: toolCall.name || "",
                                args: toolCall.arguments || {}
                            }
                        })
                    })
                }


                return new ToolMessage({
                    content: message.content || "",
                    tool_call_id: message.toolCallId || "",
                    name: message.toolCalls?.[0]?.name || "",
                })

            }), project.projectId?.toString() || "");

        for await (const [mode, data] of stream) {

            if (mode === "messages") {

                const [token] = data;

                // Tool-call chunks carry no prose, so only assistant text is forwarded.
                if (token.text) {
                    sendEvent(res, { type: "token", value: token.text });
                }
            } else if (mode === "values") {

                const newMessage = data.messages.at(-1);

                if (newMessage instanceof AIMessageChunk) {
                    await MessageModel.create({
                        conversationId: conversation.id,
                        author: "ai",
                        content: newMessage.text,
                        toolCalls: newMessage.tool_calls?.map(toolCall => {
                            return {
                                id: toolCall.id || "",
                                name: toolCall.name || "",
                                arguments: toolCall.args || {}
                            }
                        }) || []
                    });
                } else if (newMessage instanceof ToolMessage) {
                    await MessageModel.create({
                        conversationId: conversation.id,
                        author: "tool",
                        content: String(newMessage.content) || "",
                        toolCallId: newMessage.tool_call_id || "",
                    });
                }

            }
        }

        await ConversationModel.updateOne({ _id: conversation.id }, { $set: { updatedAt: new Date() } });

        sendEvent(res, { type: "done" });
        res.end();
    } catch (error) {
        if (!res.headersSent) {
            return next(error);
        }

        console.error(error);
        sendEvent(res, { type: "error", message: errorMessage(error) });
        res.end();
    }
}