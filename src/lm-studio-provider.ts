import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible"
import type { EmbeddingModelV1, LanguageModelV1 } from "@ai-sdk/provider"
import type { FetchFunction } from "@ai-sdk/provider-utils"
import { createResponsesFetch } from "./responses"
import { ensureToolParametersType } from "./responses/tools-utils"

/**
 * Common LM Studio model IDs that are frequently used.
 * This is not exhaustive - LM Studio can run any compatible model.
 */
export type LMStudioModelId = "qwen2.5-7b-instruct" | "gpt-oss" | (string & {})

/**
 * Common embedding models that can be run in LM Studio.
 */
export type LMStudioEmbeddingModelId =
  | "text-embedding-nomic-embed-text-v1.5"
  | "all-MiniLM-L6-v2"
  | (string & {})

export interface LMStudioProviderOptions {
  /**
   * Base URL for LM Studio API.
   * Defaults to http://localhost:1234/v1
   */
  baseURL?: string

  /**
   * API key for authentication. LM Studio typically doesn't require this.
   * Defaults to "lm-studio"
   */
  apiKey?: string

  /**
   * Custom headers to include in requests.
   */
  headers?: Record<string, string>

  /**
   * Custom fetch function.
   */
  fetch?: FetchFunction

  /**
   * API to use for requests.
   * - "chat": Standard OpenAI-compatible /v1/chat/completions API (default)
   * - "responses": LM Studio's /v1/responses API with reasoning support
   */
  api?: "chat" | "responses"

  /**
   * Reasoning effort for models that support reasoning.
   * Only applicable when api is "responses".
   * Values: "low" | "medium" | "high"
   */
  reasoningEffort?: "low" | "medium" | "high"
}

export function createLMStudio(options: LMStudioProviderOptions = {}) {
  // Validate that reasoningEffort is only used with responses API
  if (options.reasoningEffort && options.api !== "responses") {
    console.warn(
      '[LM Studio] reasoningEffort is only supported with api: "responses". ' +
        'The option will be ignored unless you set api: "responses".'
    )
  }

  const baseURL =
    options.baseURL ??
    process.env.LMSTUDIO_API_BASE_URL ??
    "http://localhost:1234/v1"

  const getHeaders = () => ({
    ...options.headers,
  })

  const baseFetch = options.fetch ?? fetch
  const withToolsFix: FetchFunction = async (url, init) => {
    if (init?.body) {
      try {
        const body = JSON.parse(init.body as string)
        if (body.tools && Array.isArray(body.tools)) {
          body.tools = ensureToolParametersType(body.tools)
          init.body = JSON.stringify(body)
        }
      } catch {
        // Body isn't JSON, pass through
      }
    }
    return baseFetch(url, init)
  }

  const customFetch: FetchFunction =
    options.api === "responses"
      ? createResponsesFetch(withToolsFix, {
          reasoningEffort: options.reasoningEffort,
        })
      : withToolsFix

  /**
   * https://github.com/vercel/ai/issues/5197#issuecomment-2722322811
   * Can remove after this issue is resolved.
   * Enabling structured outputs for LM Studio models.
   */
  const baseConfig = {
    provider: "lmstudio",
    url: ({ path }: { path: string; modelId: string }) => {
      let finalPath = path

      // Only replace path if using responses API
      if (options.api === "responses") {
        finalPath = path.replace("/chat/completions", "/responses")
      }

      const url = new URL(`${baseURL}${finalPath}`)
      return url.toString()
    },
    headers: getHeaders,
    fetch: customFetch,
    includeUsage: true,
    supportsStructuredOutputs: true,
  }

  const createModel = (modelId: LMStudioModelId): LanguageModelV1 =>
    new OpenAICompatibleChatLanguageModel(modelId, {}, baseConfig)

  const provider = (modelId: LMStudioModelId) => createModel(modelId)
  provider.languageModel = createModel

  provider.textEmbeddingModel = (
    modelId: LMStudioEmbeddingModelId
  ): EmbeddingModelV1<string> =>
    new OpenAICompatibleEmbeddingModel(modelId, {}, baseConfig)

  provider.imageModel = (modelId: string) =>
    new OpenAICompatibleChatLanguageModel(modelId, {}, baseConfig)

  return provider
}

/**
 * Creates an LM Studio language model instance.
 * @param model The model ID to use (e.g., "qwen2.5-7b-instruct")
 * @param options Optional configuration for the provider
 */
export const lmstudio = (
  model: LMStudioModelId | string,
  options?: LMStudioProviderOptions
): LanguageModelV1 => createLMStudio(options).languageModel(model)

/**
 * Creates an LM Studio embedding model instance.
 * @param model The embedding model ID to use
 * @param options Optional configuration for the provider
 */
export const lmstudioEmbedding = (
  model: LMStudioEmbeddingModelId | string,
  options?: LMStudioProviderOptions
): EmbeddingModelV1<string> => createLMStudio(options).textEmbeddingModel(model)
