import { describe, expect, it } from "vitest"
import { createLMStudio } from "./lm-studio-provider"

describe("createLMStudio", () => {
  it("should create a provider instance", () => {
    const provider = createLMStudio()
    expect(provider).toBeDefined()
    expect(typeof provider).toBe("function")
    expect(provider.chatModel).toBeDefined()
    expect(provider.textEmbeddingModel).toBeDefined()
    expect(provider.imageModel).toBeDefined()
  })

  it("should create a chat model", () => {
    const provider = createLMStudio()
    const model = provider("qwen2.5-7b-instruct")
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio.chat")
    expect(model.modelId).toBe("qwen2.5-7b-instruct")
  })

  it("should create a text embedding model", () => {
    const provider = createLMStudio()
    const model = provider.textEmbeddingModel(
      "text-embedding-nomic-embed-text-v1.5"
    )
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio.embedding")
    expect(model.modelId).toBe("text-embedding-nomic-embed-text-v1.5")
  })

  it("should throw for image model", () => {
    const provider = createLMStudio()
    expect(() => provider.imageModel("some-model")).toThrow()
  })
})
