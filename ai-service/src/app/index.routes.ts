import { Router } from 'express';
import aiRouter from '../routes/ai.routes.js';
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate)

router.use("/",aiRouter)


export default router;