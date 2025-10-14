import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible"

import { NoSuchModelError } from "@ai-sdk/provider"
import type { FetchFunction } from "@ai-sdk/provider-utils"

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
}

export function createLMStudio(options: LMStudioProviderOptions = {}) {
  const baseURL =
    options.baseURL ??
    process.env.LMSTUDIO_API_BASE_URL ??
    "http://localhost:1234/v1"

  const apiKey = options.apiKey ?? "lm-studio"

  const getHeaders = () => ({
    ...options.headers,
  })

  /**
   * https://github.com/vercel/ai/issues/5197#issuecomment-2722322811
   * Can remove after this issue is resolved.
   * Enabling structured outputs for LM Studio models.
   */
  const baseOptions = {
    provider: "lmstudio",
    url: ({ path }: { path: string }) => {
      const url = new URL(`${baseURL}${path}`)
      return url.toString()
    },
    headers: getHeaders,
    fetch: options.fetch,
    includeUsage: true,
    supportsStructuredOutputs: true,
  }

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
 * Creates an LM Studio language model instance.
 * @param model The model ID to use (e.g., "qwen2.5-7b-instruct")
 * @param options Optional configuration for the provider
 */
export const lmstudio = (
  model: LMStudioModelId | string,
  options?: LMStudioProviderOptions
) => createLMStudio(options).languageModel(model)

/**
 * Creates an LM Studio embedding model instance.
 * @param model The embedding model ID to use
 * @param options Optional configuration for the provider
 */
export const lmstudioEmbedding = (
  model: LMStudioEmbeddingModelId | string,
  options?: LMStudioProviderOptions
) => createLMStudio(options).textEmbeddingModel(model)
