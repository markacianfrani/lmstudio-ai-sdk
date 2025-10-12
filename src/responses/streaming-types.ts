interface ResponsesStreamEvent {
  type: string
  sequence_number: number
}

interface ResponseMetadata {
  id: string
  object: string
  created_at: number
  status: string
  model: string
  output: Array<unknown>
  previous_response_id: string | null
}

export interface ResponseCreatedEvent extends ResponsesStreamEvent {
  type: "response.created"
  response: ResponseMetadata
}

export interface ResponseInProgressEvent extends ResponsesStreamEvent {
  type: "response.in_progress"
  response: ResponseMetadata
}

interface OutputItem {
  id: string
  type: "message" | "reasoning"
  role?: string
  status?: string
  summary?: unknown[]
  content?: Array<{
    type: "output_text" | "reasoning_text"
    text: string
  }>
}

export interface ResponseOutputItemAddedEvent extends ResponsesStreamEvent {
  type: "response.output_item.added"
  output_index: number
  item: Omit<OutputItem, "role" | "status">
}

export interface ResponseContentPartAddedEvent extends ResponsesStreamEvent {
  type: "response.content_part.added"
  output_index: number
  item_index: number
  part: {
    type: "output_text" | "reasoning_text"
    text: string
  }
}

export interface ResponseContentPartDeltaEvent extends ResponsesStreamEvent {
  type: "response.content_part.delta"
  output_index: number
  item_index: number
  delta: {
    text: string
  }
}

export interface ResponseReasoningTextDeltaEvent extends ResponsesStreamEvent {
  type: "response.reasoning_text.delta"
  item_id: string
  output_index: number
  content_index: number
  delta: string
}

export interface ResponseOutputTextDeltaEvent extends ResponsesStreamEvent {
  type: "response.output_text.delta"
  item_id: string
  output_index: number
  content_index: number
  delta: string
}

export interface ResponseOutputItemDoneEvent extends ResponsesStreamEvent {
  type: "response.output_item.done"
  output_index: number
  item: Omit<OutputItem, "summary">
}

interface UsageInfo {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  output_tokens_details?: {
    reasoning_tokens?: number
  }
}

interface ResponseWithOutput {
  id: string
  object: string
  created_at: number
  status: string
  model: string
  output: Array<OutputItem>
  usage?: UsageInfo
  previous_response_id?: string | null
}

export interface ResponseDoneEvent extends ResponsesStreamEvent {
  type: "response.done"
  response: ResponseWithOutput
}

export interface ResponseCompletedEvent extends ResponsesStreamEvent {
  type: "response.completed"
  response: ResponseWithOutput
}

export type ResponsesAPIStreamEvent =
  | ResponseCreatedEvent
  | ResponseInProgressEvent
  | ResponseOutputItemAddedEvent
  | ResponseContentPartAddedEvent
  | ResponseContentPartDeltaEvent
  | ResponseReasoningTextDeltaEvent
  | ResponseOutputTextDeltaEvent
  | ResponseOutputItemDoneEvent
  | ResponseDoneEvent
  | ResponseCompletedEvent
