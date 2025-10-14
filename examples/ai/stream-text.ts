import { lmstudio } from "@cianfrani/lmstudio"
import { streamText } from "ai"
import "dotenv/config"

async function main() {
  console.log("\n=== STREAMING TEXT ===")
  const result = streamText({
    model: lmstudio("qwen2.5-7b-instruct"),
    prompt: "Write a short poem about artificial intelligence.",
  })

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }

  console.log("\n")
  const usage = await result.usage
  console.log("Token usage:", usage)
}

main().catch(console.error)
