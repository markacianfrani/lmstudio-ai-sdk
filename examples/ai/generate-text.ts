import { lmstudio } from "@cianfrani/lmstudio"
import { generateText } from "ai"
import "dotenv/config"

async function main() {
  const prompt = "What is the square root of 144? Show your reasoning."

  // Test 1: Standard chat completions API (default)
  console.log("\n=== STANDARD CHAT API ===")
  const resultChat = await generateText({
    model: lmstudio("gpt-oss"),
    prompt,
  })
  console.log("Result:", `${resultChat.text.substring(0, 100)}...`)
  console.log("Total tokens:", resultChat.usage.totalTokens)

  // Test 2: Responses API with high reasoning
  console.log("\n=== RESPONSES API (high reasoning) ===")
  const resultHigh = await generateText({
    model: lmstudio("gpt-oss", { api: "responses", reasoningEffort: "high" }),
    prompt,
  })
  console.log("Result:", `${resultHigh.text.substring(0, 100)}...`)
  console.log("Total tokens:", resultHigh.usage.totalTokens)

  // Test 3: Responses API with low reasoning
  console.log("\n=== RESPONSES API (low reasoning) ===")
  const resultLow = await generateText({
    model: lmstudio("gpt-oss", { api: "responses", reasoningEffort: "low" }),
    prompt,
  })
  console.log("Result:", `${resultLow.text.substring(0, 100)}...`)
  console.log("Total tokens:", resultLow.usage.totalTokens)

  console.log("\n=== COMPARISON ===")
  console.log(`Chat API: ${resultChat.usage.totalTokens} tokens`)
  console.log(`Responses (high): ${resultHigh.usage.totalTokens} tokens`)
  console.log(`Responses (low): ${resultLow.usage.totalTokens} tokens`)
}

main().catch(console.error)
