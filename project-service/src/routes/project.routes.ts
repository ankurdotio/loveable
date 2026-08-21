import { Router } from "express";
import {
	createProjectController,
	launchProjectController
} from "../controllers/project.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"


const projectRouter = Router()


projectRouter.use(authenticate)
projectRouter.post('/', createProjectController)
projectRouter.post('/:projectId/launch', launchProjectController)


export default projectRouter