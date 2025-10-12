import { lmstudio } from "@cianfrani/lmstudio"
import { streamText } from "ai"
import "dotenv/config"

async function main() {
  console.log("\n=== STREAMING WITH CHAT API ===")
  const chatResult = streamText({
    model: lmstudio("qwen2.5-7b-instruct"),
    prompt: "Write a short poem about artificial intelligence.",
  })

  for await (const textPart of chatResult.textStream) {
    process.stdout.write(textPart)
  }

  console.log("\n")
  const chatUsage = await chatResult.usage
  console.log("Token usage:", chatUsage)

  console.log("\n=== STREAMING WITH RESPONSES API ===")
  const responsesResult = streamText({
    model: lmstudio("gpt-oss", { api: "responses", reasoningEffort: "medium" }),
    prompt: "Write a short poem about artificial intelligence.",
  })

  for await (const textPart of responsesResult.textStream) {
    process.stdout.write(textPart)
  }

  console.log("\n")
  const responsesUsage = await responsesResult.usage
  console.log("Token usage:", responsesUsage)
  console.log("Finish reason:", await responsesResult.finishReason)
}

main().catch(console.error)
