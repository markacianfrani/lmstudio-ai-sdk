import { lmstudio } from "@kin/lmstudio-ai-sdk"
import { generateObject } from "ai"
import { z } from "zod"
import "dotenv/config"

async function main() {
  const result = await generateObject({
    model: lmstudio("qwen2.5-7b-instruct"),
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(
          z.object({
            name: z.string(),
            amount: z.string(),
          })
        ),
        steps: z.array(z.string()),
      }),
    }),
    prompt: "Generate a recipe for chocolate chip cookies.",
  })

  console.log("Recipe:")
  console.log(JSON.stringify(result.object, null, 2))
  console.log()
  console.log("Token usage:", result.usage)
  console.log("Finish reason:", result.finishReason)
}

main().catch(console.error)
