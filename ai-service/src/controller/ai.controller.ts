import { MessageModel } from "../models/message.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { ProjectModel } from "../models/project.model.js";
import type { NextFunction, Request, Response } from "express";
import { getConversationTitle } from "../service/ai/ai.service.js";


export async function handleMessageController(req: Request, res: Response, next: NextFunction) {

    const user = req.user;
    let conversation = null;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const project = await ProjectModel.findOne({ _id: req.body.projectId, user: user.id });

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

}