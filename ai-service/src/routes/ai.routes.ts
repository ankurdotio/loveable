import { Router } from 'express';
import { handleMessageController } from '../controller/ai.controller.js';

const router = Router();



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