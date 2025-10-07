export type LMStudioEmbeddingModelId =
  | "text-embedding-nomic-embed-text-v1.5"
  | "all-MiniLM-L6-v2"
  | (string & {})

export type LMStudioEmbeddingSettings = Record<string, never>
