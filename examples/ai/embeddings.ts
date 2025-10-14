import { lmstudioEmbedding } from "@kin/lmstudio-ai-sdk"
import { embed } from "ai"
import "dotenv/config"

async function main() {
  const { embedding, usage } = await embed({
    model: lmstudioEmbedding("text-embedding-nomic-embed-text-v1.5"),
    value: "The quick brown fox jumps over the lazy dog.",
  })

  console.log("Embedding dimensions:", embedding.length)
  console.log("First 5 values:", embedding.slice(0, 5))
  console.log()
  console.log("Token usage:", usage)
}

main().catch(console.error)
