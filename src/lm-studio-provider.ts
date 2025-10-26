import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

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

  const baseOptions = {
    name: "lmstudio",
    baseURL: baseURL,
    apiKey: options.apiKey ?? "lm-studio",
    headers: options.headers ?? {},
    fetch: options.fetch,
  }

  return createOpenAICompatible(baseOptions)
}

/**
 * Default LM Studio provider instance.
 */
export const lmstudio = createLMStudio()

/**
 * Creates an LM Studio embedding model instance.
 * @param model The embedding model ID to use
 * @param options Optional configuration for the provider
 */
export const lmstudioEmbedding = (
  model: LMStudioEmbeddingModelId | string,
  options?: LMStudioProviderOptions
) => createLMStudio(options).textEmbeddingModel(model)
