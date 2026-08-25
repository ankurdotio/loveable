import { ChatMistralAI } from "@langchain/mistralai"
import { createAgent, HumanMessage } from "langchain"
import * as z from "zod"
import { env } from "../../config/env.js"



/**
 * @description accept the user first message and return the title of the conversation
 * @param message string
 * @returns string
 */
export async function getConversationTitle(message: string): Promise<string> {

    const model = new ChatMistralAI({
        model: "mistral-small-latest",
        apiKey: env.MISTRAL_API_KEY,
    })

    const agent = createAgent({
        model,
        tools: [],
        systemPrompt: `
        You will be given a message from a user. Your task is to generate a concise and descriptive title for the conversation based on the content of the message. The title should be relevant, clear, and capture the essence of the user's message. Please provide the title in a single line without any additional commentary or explanation.
        `,
        responseFormat: z.object({
            title: z.string().describe("The title of the conversation based on the user's message")
        })
    })

    const response = await agent.invoke({
        messages: [
            new HumanMessage(message)
        ]
    })

    return response.structuredResponse.title

}

