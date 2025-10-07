export type LMStudioChatModelId =
  | "qwen2.5-7b-instruct"
  | "gpt-oss"
  | (string & {})

export type LMStudioChatSettings = Record<string, never>
