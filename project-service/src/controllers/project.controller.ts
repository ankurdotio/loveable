import type { Request, Response } from "express"
import { createPod } from "../service/kubernetes.service.js"

export const createPodController = async (req: Request, res: Response) => {

    await createPod()

    res.status(200).json({
        message: "Pod created successfully"
    })
}