import dotenv from "dotenv"

dotenv.config()

function requiredEnv(name: "MONGODB_URI" | "ACCESS_TOKEN_SECRET" | "MESSAGE_BROKER_URL" | "MISTRAL_API_KEY"): string {
    const value = process.env[name]

    if (!value?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10)

if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer")
}

export const env = {
    PORT: port,
    MONGODB_URI: requiredEnv("MONGODB_URI"),
    ACCESS_TOKEN_SECRET: requiredEnv("ACCESS_TOKEN_SECRET"),
    MESSAGE_BROKER_URL: requiredEnv("MESSAGE_BROKER_URL"),
    MISTRAL_API_KEY: requiredEnv("MISTRAL_API_KEY"),
}