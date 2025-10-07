import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible"
import type { EmbeddingModelV1, LanguageModelV1 } from "@ai-sdk/provider"
import { NoSuchModelError } from "@ai-sdk/provider"
import {
  type FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils"
import type {
  LMStudioChatModelId,
  LMStudioChatSettings,
} from "./lm-studio-chat-settings"
import type {
  LMStudioEmbeddingModelId,
  LMStudioEmbeddingSettings,
} from "./lm-studio-embedding-settings"

export interface LMStudioProviderSettings {
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

export interface LMStudioProvider {
  /**
   * Creates a chat model for text generation.
   */
  (
    modelId: LMStudioChatModelId,
    settings?: LMStudioChatSettings
  ): LanguageModelV1

  /**
   * Creates a chat model for text generation.
   */
  chatModel(
    modelId: LMStudioChatModelId,
    settings?: LMStudioChatSettings
  ): LanguageModelV1

  /**
   * Creates a text embedding model.
   */
  textEmbeddingModel(
    modelId: LMStudioEmbeddingModelId,
    settings?: LMStudioEmbeddingSettings
  ): EmbeddingModelV1<string>

  /**
   * Creates an image model.
   */
  imageModel(modelId: string): never
}

export function createLMStudio(
  options: LMStudioProviderSettings = {}
): LMStudioProvider {
  const baseURL = withoutTrailingSlash(
    options.baseURL ??
      process.env.LMSTUDIO_API_BASE_URL ??
      "http://localhost:1234/v1"
  )

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey ?? "lm-studio",
      environmentVariableName: "LMSTUDIO_API_KEY",
      description: "LM Studio API key",
    })}`,
    ...options.headers,
  })

  interface CommonModelConfig {
    provider: string
    url: ({ path }: { path: string }) => string
    headers: () => Record<string, string>
    fetch?: FetchFunction
  }

  const getCommonModelConfig = (modelType: string): CommonModelConfig => ({
    provider: `lmstudio.${modelType}`,
    url: ({ path }) => {
      const url = new URL(`${baseURL}${path}`)
      return url.toString()
    },
    headers: getHeaders,
    fetch: options.fetch,
  })

  const createChatModel = (
    modelId: LMStudioChatModelId,
    settings: LMStudioChatSettings = {}
  ) =>
    new OpenAICompatibleChatLanguageModel(
      modelId,
      {},
      {
        ...settings,
        ...getCommonModelConfig("chat"),
      }
    )

  const createTextEmbeddingModel = (
    modelId: LMStudioEmbeddingModelId,
    settings: LMStudioEmbeddingSettings = {}
  ) =>
    new OpenAICompatibleEmbeddingModel(
      modelId,
      {},
      {
        ...settings,
        ...getCommonModelConfig("embedding"),
      }
    )

  const provider = (
    modelId: LMStudioChatModelId,
    settings?: LMStudioChatSettings
  ) => createChatModel(modelId, settings)

  provider.chatModel = createChatModel
  provider.textEmbeddingModel = createTextEmbeddingModel
  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "imageModel" })
  }

  return provider
}

/**
 * Default LM Studio provider instance.
 */
export const lmstudio = createLMStudio()
