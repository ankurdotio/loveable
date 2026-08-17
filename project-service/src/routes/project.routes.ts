import { Router } from "express";
import { createPodController } from "../controllers/project.controller.js"


const projectRouter = Router()


projectRouter.get('/', createPodController)


export default projectRouter