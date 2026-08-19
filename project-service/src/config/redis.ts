import { Redis } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

/** Command connection used for reads, writes and publishing. */
export const redis = new Redis(REDIS_URL)

// A connection in subscriber mode cannot run normal commands, so it needs its own client.
/** Dedicated connection for keyspace and application channel subscriptions. */
export const redisSubscriber = new Redis(REDIS_URL)
redis.on("error", (err) => console.error("[redis] client error:", err.message))
redisSubscriber.on("error", (err) => console.error("[redis] subscriber error:", err.message))



redis.once("ready", () => {
    console.log("[redis] client connected")
})

redisSubscriber.once("ready", () => {
    console.log("[redis] subscriber connected")
})