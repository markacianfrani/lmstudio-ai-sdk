import { lmstudio } from "@cianfrani/lmstudio"
import { generateText } from "ai"
import "dotenv/config"

async function main() {
  const prompt = "What is the square root of 144?"

  console.log("\n=== CHAT API ===")
  const result = await generateText({
    model: lmstudio("gpt-oss"),
    prompt,
  })
  console.log("Result:", `${result.text.substring(0, 100)}...`)
  console.log("Total tokens:", result.usage.totalTokens)
}

main().catch(console.error)
