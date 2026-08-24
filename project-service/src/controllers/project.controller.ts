import type { NextFunction, Request, Response } from "express"
import { AppError } from "../middlewares/error.middleware.js"
import { createProject, launchProject } from "../service/project.service.js"
import { publishMessage } from "../service/broker.service.js"

export async function createProjectController(req: Request, res: Response, next: NextFunction) {
    try {
        const title = typeof req.body?.title === "string" ? req.body.title.trim() : ""

        if (!title || title.length > 120) {
            throw new AppError(400, "Title must contain between 1 and 120 characters")
        }

        const project = await createProject(req.user!.id, title)

        await publishMessage("project_created", JSON.stringify({ projectId: project.id, userId: req.user!.id }))

        res.status(201).json({ project })
    } catch (error) {
        next(error)
    }
}

export async function launchProjectController(req: Request, res: Response, next: NextFunction) {
    try {
        const projectId = req.params.projectId

        if (typeof projectId !== "string") {
            throw new AppError(404, "Project not found")
        }

        const project = await launchProject(projectId, req.user!.id)

        res.status(200).json({
            message: "Project launched successfully",
            project
        })
    } catch (error) {
        next(error)
    }
}