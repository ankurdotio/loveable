import type { NextFunction, Request, Response } from "express"

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string
    ) {
        super(message)
    }
}

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message })
        return
    }

    console.error(error)
    res.status(500).json({ message: "Internal server error" })
}