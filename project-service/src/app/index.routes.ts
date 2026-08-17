import { Router } from "express";
import projectRouter from "../routes/project.routes.js";

const router = Router()

router.use('/',projectRouter)

export default router