import mongoose from "mongoose"
import { env } from "./env.js"

export async function connectDatabase() {
    await mongoose.connect(env.MONGODB_URI)
    console.log("Connected to MongoDB")
}