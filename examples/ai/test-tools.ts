import { lmstudio } from "@cianfrani/lmstudio"
import { generateText } from "ai"
import { z } from "zod"
import "dotenv/config"

async function testChatTools() {
  console.log("\n=== TESTING TOOLS WITH CHAT API ===\n")

  const result = await generateText({
    model: lmstudio("qwen2.5-7b-instruct"),
    tools: {
      weather: {
        description: "Get the weather in a location",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      },
    },
    prompt: "What is the weather in San Francisco?",
    maxRetries: 0,
  })

  console.log("Result:", result.text)
  console.log("Tool calls:", result.toolCalls)
}

async function main() {
  try {
    await testChatTools()
  } catch (error) {
    console.error("Chat API error:", error)
  }
}

main().catch(console.error)
