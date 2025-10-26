import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible"
import type { OpenAICompatibleChatConfig } from "@ai-sdk/openai-compatible/internal"
import {
  type EmbeddingModelV2,
  type LanguageModelV2,
  NoSuchModelError,
  type ProviderV2,
} from "@ai-sdk/provider"
import {
  type FetchFunction,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils"

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

export interface LMStudioProvider extends ProviderV2 {
  (modelId: LMStudioModelId): LanguageModelV2

  languageModel(modelId: LMStudioModelId): LanguageModelV2

  textEmbeddingModel(
    modelId: LMStudioEmbeddingModelId
  ): EmbeddingModelV2<string>
}

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
}

export function createLMStudio(options: LMStudioProviderOptions = {}) {
  const baseURL = withoutTrailingSlash(
    options.baseURL ??
      process.env.LMSTUDIO_BASE_URL ??
      "http://localhost:1234/v1"
  )

  const getHeaders = () => ({
    ...options.headers,
  })

  const baseOptions = {
    provider: "lmstudio",
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch,
    includeUsage: true,
    supportsStructuredOutputs: true,
  } satisfies OpenAICompatibleChatConfig

  const createModel = (modelId: LMStudioModelId) =>
    new OpenAICompatibleChatLanguageModel(modelId, baseOptions)

  const provider = (modelId: LMStudioModelId) => createModel(modelId)
  provider.languageModel = createModel

  provider.textEmbeddingModel = (modelId: LMStudioEmbeddingModelId) =>
    new OpenAICompatibleEmbeddingModel(modelId, baseOptions)

  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "imageModel" })
  }

  return provider
}

/**
 * Default LM Studio provider instance.
 */
export const lmstudio = createLMStudio()
