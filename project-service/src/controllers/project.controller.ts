import type { Request, Response } from "express"
import { createPod, createService } from "../service/kubernetes.service.js"
import { v4 as uuid } from "uuid"

export const createPodController = async (req: Request, res: Response) => {

    const uniqueId = uuid()

    const podName = `nextjs-pod-${uniqueId}`
    const serviceName = `nextjs-service-${uniqueId}`

    await createPod(podName)
    await createService(serviceName, podName)

    res.status(200).json({
        message: "Pod created successfully",
        previewUrl: `http://${uniqueId}.preview.localhost`
    })
}