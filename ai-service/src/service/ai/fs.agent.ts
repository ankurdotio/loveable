import { createAgent } from "langchain";
import { ChatMistralAI } from "@langchain/mistralai";
import { env } from "../../config/env.js";
import { fileTools } from "./fs.tool.js";
import { mainAgentInstruction } from "./fs.instruction.js";


const model = new ChatMistralAI({
    model: "mistral-large-latest",
    apiKey: env.MISTRAL_API_KEY,
})

const mainAgent = createAgent({
    model,
    tools: [...fileTools],
    systemPrompt: mainAgentInstruction
})


export { mainAgent }