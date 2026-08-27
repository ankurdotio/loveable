import { Router } from 'express';
import {
    handleMessageController,
    listConversationsController,
    createConversationController,
    listMessagesController
} from '../controller/ai.controller.js';

const router = Router();

/**
 * GET /api/ai/projects/:projectId/conversations
 */
router.get("/projects/:projectId/conversations", listConversationsController);

/**
 * POST /api/ai/projects/:projectId/conversations
 * req.body = { title?: string }
 */
router.post("/projects/:projectId/conversations", createConversationController);

/**
 * GET /api/ai/conversations/:conversationId/messages
 */
router.get("/conversations/:conversationId/messages", listMessagesController);

/**
 * POST /api/ai/message
 * req.body= {
 * content: string
 * conversationId?: string
 * projectId: string
 * }
 */
router.post("/message", handleMessageController);

export default router;