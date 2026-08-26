import { MessageModel } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { ProjectModel } from "../models/project.model.js";
import type { NextFunction, Request, Response } from "express";
import { getConversationTitle } from "../service/ai/ai.service.js";
import { handleUserMessage } from "../service/ai/ai.service.js";
import { HumanMessage, AIMessage, ToolMessage, AIMessageChunk } from "langchain";


export async function handleMessageController(req: Request, res: Response, next: NextFunction) {

    const user = req.user;
    let conversation = null;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const project = await ProjectModel.findOne({ projectId: req.body.projectId, userId: user.id });

    if (!project) {
        return res.status(404).json({ error: "Project not found" });
    }


    if (req.body.conversationId) {
        conversation = await ConversationModel.findOne({ _id: req.body.conversationId });

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        if (conversation.project?.toString() !== project.id) {
            return res.status(403).json({ error: "Conversation does not belong to the project" });
        }

        if (conversation.user?.toString() !== user.id) {
            return res.status(403).json({ error: "Conversation does not belong to the user" });
        }
    } else {

        const title = await getConversationTitle(req.body.content);

        conversation = await ConversationModel.create({
            title,
            project: project.id,
            user: user.id
        })
    }


    // –––––––––––––––––––– Conversation Headers –––––––––––––––––––
    res.setHeader('X-Conversation-Id', conversation.id);
    res.setHeader('X-Conversation-Title', conversation.title);
    res.setHeader('Access-Control-Expose-Headers', 'X-Conversation-Id, X-Conversation-Title');


    // ––––––––––––––––––– SSE Headers –––––––––––––––––––
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");



    await MessageModel.create({
        conversationId: conversation.id,
        author: "user",
        content: req.body.content,
        toolCalls: []
    })

    const messages = await MessageModel.find({ conversationId: conversation.id })

    const stream = await handleUserMessage(
        messages.map(message => {
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

            const [token, metadata] = data;

            res.write(`data: ${token.text}\n\n`);
        } else if (mode === "values") {
            // console.log("Received values:", data);

            const currentStateMessages = data.messages

            const newMessage = currentStateMessages.at(-1);

            console.log("New message:", newMessage);

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

    res.end();
}