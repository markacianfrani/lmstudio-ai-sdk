/**
 * Request body format for LM Studio responses API
 */
export interface ResponsesAPIRequestBody {
  model: string
  input: string
  reasoning?: {
    effort: "low" | "medium" | "high"
  }
  [key: string]: unknown
}

/**
 * Content item in responses API output
 */
export interface ResponsesAPIContent {
  type: "output_text" | "reasoning_text"
  text: string
}

/**
 * Output item in responses API response
 */
export interface ResponsesAPIOutput {
  id: string
  type: "message" | "reasoning" | "function_call"
  role?: string
  status?: string
  content?: ResponsesAPIContent[]
  summary?: unknown[]
  // Function call fields
  call_id?: string
  name?: string
  arguments?: string
}

/**
 * Response body format from LM Studio responses API
 */
export interface ResponsesAPIResponseBody {
  id: string
  object: string
  created_at: number
  status: string
  model: string
  output: ResponsesAPIOutput[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
    output_tokens_details?: {
      reasoning_tokens?: number
    }
  }
  previous_response_id?: string | null
}

/**
 * Chat completions format message
 */
export interface ChatMessage {
  role: string
  content: string | null
  reasoning?: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: {
      name: string
      arguments: string
    }
  }>
}

/**
 * Chat completions request body
 */
export interface ChatCompletionsRequestBody {
  model: string
  messages: Array<{ role: string; content: string }>
  reasoning_effort?: string
  user?: string
  [key: string]: unknown
}
