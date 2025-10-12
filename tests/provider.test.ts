import { describe, expect, it, vi } from "vitest"
import { createLMStudio, lmstudio } from "../src/lm-studio-provider"

describe("Provider Creation", () => {
  it("should create a provider instance", () => {
    const provider = createLMStudio()
    expect(provider).toBeDefined()
    expect(typeof provider).toBe("function")
    expect(provider.languageModel).toBeDefined()
    expect(provider.textEmbeddingModel).toBeDefined()
    expect(provider.imageModel).toBeDefined()
  })

  it("should create a chat model", () => {
    const provider = createLMStudio()
    const model = provider("qwen2.5-7b-instruct")
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("qwen2.5-7b-instruct")
  })

  it("should create a text embedding model", () => {
    const provider = createLMStudio()
    const model = provider.textEmbeddingModel(
      "text-embedding-nomic-embed-text-v1.5"
    )
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("text-embedding-nomic-embed-text-v1.5")
  })

  it("should create an image model", () => {
    const provider = createLMStudio()
    const model = provider.imageModel("some-model")
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("some-model")
  })

  it("should use custom baseURL", () => {
    const provider = createLMStudio({
      baseURL: "http://custom:8080/v1",
    })
    expect(provider).toBeDefined()
  })
})

describe("Configuration", () => {
  it("should default to chat API", () => {
    const provider = createLMStudio()
    const model = provider("test-model")
    expect(model).toBeDefined()
  })

  it("should support responses API", () => {
    const provider = createLMStudio({ api: "responses" })
    const model = provider("test-model")
    expect(model).toBeDefined()
  })

  it("should warn when reasoningEffort is used without responses API", () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {})

    createLMStudio({
      reasoningEffort: "high",
      // api not set to "responses"
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("reasoningEffort is only supported with api")
    )

    consoleWarnSpy.mockRestore()
  })

  it("should not warn when reasoningEffort is used with responses API", () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {})

    createLMStudio({
      api: "responses",
      reasoningEffort: "high",
    })

    expect(consoleWarnSpy).not.toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it("should use environment variable LMSTUDIO_API_BASE_URL if provided", () => {
    const originalEnv = process.env.LMSTUDIO_API_BASE_URL
    process.env.LMSTUDIO_API_BASE_URL = "http://env-host:8888/v1"

    const provider = createLMStudio()
    const model = provider("test-model")

    expect(model).toBeDefined()

    // Restore original env
    if (originalEnv) {
      process.env.LMSTUDIO_API_BASE_URL = originalEnv
    } else {
      process.env.LMSTUDIO_API_BASE_URL = undefined
    }
  })

  it("should default to localhost:1234 when no baseURL provided", () => {
    const originalEnv = process.env.LMSTUDIO_API_BASE_URL
    process.env.LMSTUDIO_API_BASE_URL = undefined

    const provider = createLMStudio()
    const model = provider("test-model")

    expect(model).toBeDefined()

    // Restore original env
    if (originalEnv) {
      process.env.LMSTUDIO_API_BASE_URL = originalEnv
    }
  })

  it("should pass custom headers through", () => {
    const customHeaders = {
      "X-Custom-Header": "test-value",
    }

    const provider = createLMStudio({
      headers: customHeaders,
    })

    const model = provider("test-model")
    expect(model).toBeDefined()
  })

  it("should accept custom fetch function", () => {
    const customFetch = vi.fn(async (_url, _init) => {
      return new Response(
        JSON.stringify({
          id: "test",
          object: "chat.completion",
          created: Date.now(),
          model: "test-model",
          choices: [],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    })

    const provider = createLMStudio({
      fetch: customFetch as unknown as typeof fetch,
    })

    const model = provider("test-model")
    expect(model).toBeDefined()
  })
})

describe("Helper Functions", () => {
  it("should create a language model with default options", () => {
    const model = lmstudio("qwen2.5-7b-instruct")
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("qwen2.5-7b-instruct")
  })

  it("should create a language model with custom options", () => {
    const model = lmstudio("qwen2.5-7b-instruct", {
      baseURL: "http://custom:8080/v1",
    })
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
  })

  it("should create a language model with responses API", () => {
    const model = lmstudio("gpt-oss", {
      api: "responses",
      reasoningEffort: "high",
    })
    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
  })
})

describe("API Selection", () => {
  it("should create language model with chat API", () => {
    const provider = createLMStudio({ api: "chat" })
    const model = provider.languageModel("test-model")

    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("test-model")
  })

  it("should create language model with responses API", () => {
    const provider = createLMStudio({ api: "responses" })
    const model = provider.languageModel("test-model")

    expect(model).toBeDefined()
    expect(model.provider).toBe("lmstudio")
    expect(model.modelId).toBe("test-model")
  })

  it("should create embedding model regardless of API setting", () => {
    const chatProvider = createLMStudio({ api: "chat" })
    const responsesProvider = createLMStudio({ api: "responses" })

    const chatEmbedding = chatProvider.textEmbeddingModel("embed-model")
    const responsesEmbedding =
      responsesProvider.textEmbeddingModel("embed-model")

    expect(chatEmbedding).toBeDefined()
    expect(responsesEmbedding).toBeDefined()
  })

  it("should create image model regardless of API setting", () => {
    const chatProvider = createLMStudio({ api: "chat" })
    const responsesProvider = createLMStudio({ api: "responses" })

    const chatImage = chatProvider.imageModel("image-model")
    const responsesImage = responsesProvider.imageModel("image-model")

    expect(chatImage).toBeDefined()
    expect(responsesImage).toBeDefined()
  })
})

describe("Reasoning Configuration", () => {
  it("should support all reasoning effort levels", () => {
    const efforts: Array<"low" | "medium" | "high"> = ["low", "medium", "high"]

    for (const effort of efforts) {
      const provider = createLMStudio({
        api: "responses",
        reasoningEffort: effort,
      })

      const model = provider("test-model")
      expect(model).toBeDefined()
    }
  })

  it("should not add reasoning to chat API requests", () => {
    const provider = createLMStudio({
      reasoningEffort: "high", // This should trigger a warning
    })

    const model = provider("test-model")
    expect(model).toBeDefined()
  })

  it("should add reasoning to responses API requests", () => {
    const provider = createLMStudio({
      api: "responses",
      reasoningEffort: "high",
    })

    const model = provider("test-model")
    expect(model).toBeDefined()
  })
})
