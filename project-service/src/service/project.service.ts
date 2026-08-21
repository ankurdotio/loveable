import { isValidObjectId } from "mongoose"
import { v4 as uuid } from "uuid"
import { Project } from "../models/project.model.js"
import { AppError } from "../middlewares/error.middleware.js"
import {
    createPod,
    createService,
    deletePod,
    deleteService
} from "./kubernetes.service.js"
import { recordActivity } from "./activity.service.js"

export function createProject(userId: string, title: string) {
    return Project.create({ user: userId, title })
}

export async function launchProject(projectId: string, userId: string) {
    if (!isValidObjectId(projectId)) {
        throw new AppError(404, "Project not found")
    }

    const project = await Project.findOneAndUpdate(
        {
            _id: projectId,
            user: userId,
            status: { $in: ["created", "failed"] }
        },
        { $set: { status: "launching" } },
        { new: true }
    )

    if (!project) {
        const ownedProject = await Project.findOne({ _id: projectId, user: userId })

        if (!ownedProject) {
            throw new AppError(404, "Project not found")
        }

        if (ownedProject.status === "running") {
            return ownedProject
        }

        throw new AppError(409, "Project launch is already in progress")
    }

    const runtimeId = uuid()
    const podName = `nextjs-pod-${runtimeId}`
    const serviceName = `nextjs-service-${runtimeId}`

    try {
        await createPod(podName, project.id)
        await createService(serviceName, podName)
        await recordActivity(runtimeId)

        project.status = "running"
        project.runtimeId = runtimeId
        project.previewUrl = `http://${runtimeId}.preview.localhost`
        await project.save()

        return project
    } catch (error) {
        await Promise.allSettled([
            deleteService(serviceName),
            deletePod(podName)
        ])
        project.status = "failed"
        await project.save()
        throw error
    }
}