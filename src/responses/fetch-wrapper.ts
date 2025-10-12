import type { FetchFunction } from "@ai-sdk/provider-utils"
import type { ResponsesAPIStreamEvent } from "./streaming-types"
import {
  transformRequestForResponses,
  transformResponseFromResponses,
} from "./transformations"
import type { ResponsesAPIResponseBody } from "./types"

/**
 * Debug logging helper that only logs when DEBUG_LMSTUDIO env var is set
 */
function debug(message: string, data?: unknown): void {
  if (process.env.DEBUG_LMSTUDIO) {
    console.log(
      `[LM Studio] ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    )
  }
}

function isStreamingResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type")
  return contentType?.includes("text/event-stream") ?? false
}

class StreamState {
  private responseId = ""
  private responseCreatedAt = 0
  private responseModel = ""
  private currentRole = "assistant"
  private outputItems: Map<
    number,
    { type: "message" | "reasoning"; contentParts: Map<number, string> }
  > = new Map()

  setResponseMetadata(id: string, createdAt: number, model: string): void {
    this.responseId = id
    this.responseCreatedAt = createdAt
    this.responseModel = model
  }

  addOutputItem(
    outputIndex: number,
    type: "message" | "reasoning",
    role?: string
  ): void {
    if (role) {
      this.currentRole = role
    }
    this.outputItems.set(outputIndex, {
      type,
      contentParts: new Map(),
    })
  }

  getOutputItem(
    outputIndex: number
  ):
    | { type: "message" | "reasoning"; contentParts: Map<number, string> }
    | undefined {
    return this.outputItems.get(outputIndex)
  }

  addContentPart(outputIndex: number, itemIndex: number, text: string): void {
    const item = this.outputItems.get(outputIndex)
    if (item) {
      item.contentParts.set(itemIndex, text)
    }
  }

  appendContentDelta(
    outputIndex: number,
    itemIndex: number,
    deltaText: string
  ): void {
    const item = this.outputItems.get(outputIndex)
    if (item) {
      const existing = item.contentParts.get(itemIndex) || ""
      item.contentParts.set(itemIndex, existing + deltaText)
    }
  }

  createChatChunk(
    deltaContent?: string,
    deltaReasoning?: string,
    finishReason?: string | null,
    includeRole?: boolean
  ): string {
    const delta: Record<string, unknown> = {}

    if (includeRole) {
      delta.role = this.currentRole
    }
    if (deltaContent !== undefined) {
      delta.content = deltaContent
    }
    if (deltaReasoning !== undefined) {
      delta.reasoning = deltaReasoning
    }

    const chunk = {
      id: this.responseId,
      object: "chat.completion.chunk",
      created: this.responseCreatedAt,
      model: this.responseModel,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason || null,
        },
      ],
    }

    return `data: ${JSON.stringify(chunk)}\n\n`
  }
}

function transformResponsesEvent(
  event: ResponsesAPIStreamEvent,
  state: StreamState
): string {
  switch (event.type) {
    case "response.created":
      state.setResponseMetadata(
        event.response.id,
        event.response.created_at,
        event.response.model
      )
      return state.createChatChunk(undefined, undefined, null, true)

    case "response.in_progress":
      return ""

    case "response.output_item.added":
      state.addOutputItem(
        event.output_index,
        event.item.type,
        "role" in event.item && typeof event.item.role === "string"
          ? event.item.role
          : undefined
      )
      return ""

    case "response.content_part.added":
      state.addContentPart(
        event.output_index,
        event.item_index,
        event.part.text
      )
      return ""

    case "response.content_part.delta": {
      state.appendContentDelta(
        event.output_index,
        event.item_index,
        event.delta.text
      )

      const item = state.getOutputItem(event.output_index)
      if (item?.type === "message") {
        return state.createChatChunk(event.delta.text)
      }
      if (item?.type === "reasoning") {
        return state.createChatChunk(undefined, event.delta.text)
      }
      return ""
    }

    case "response.reasoning_text.delta":
      return state.createChatChunk(undefined, event.delta)

    case "response.output_text.delta":
      return state.createChatChunk(event.delta)

    case "response.output_item.done":
      return ""

    case "response.done":
    case "response.completed": {
      let result = state.createChatChunk(undefined, undefined, "stop")

      if (event.response.usage) {
        const usageChunk = {
          id: event.response.id,
          object: "chat.completion.chunk",
          created: event.response.created_at,
          model: event.response.model,
          choices: [],
          usage: {
            prompt_tokens: event.response.usage.input_tokens || 0,
            completion_tokens: event.response.usage.output_tokens || 0,
            total_tokens: event.response.usage.total_tokens || 0,
          },
        }
        result += `data: ${JSON.stringify(usageChunk)}\n\n`
      }

      return result
    }

    default:
      return ""
  }
}

async function transformStreamingResponse(
  response: Response
): Promise<Response> {
  const reader = response.body?.getReader()
  if (!reader) {
    return response
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const state = new StreamState()

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = ""

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            controller.close()
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          // Keep the last (potentially incomplete) line in buffer
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.trim()) {
              continue
            }

            if (line.startsWith("event:")) {
              continue
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6)

              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                continue
              }

              try {
                const event = JSON.parse(data) as ResponsesAPIStreamEvent
                const transformed = transformResponsesEvent(event, state)
                if (transformed) {
                  controller.enqueue(encoder.encode(transformed))
                }
              } catch (error) {
                debug("Error parsing SSE event", { line, error })
                controller.error(
                  new Error(`Failed to parse SSE event: ${error}`)
                )
                return
              }
            }
          }
        }
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await reader.cancel()
    },
  })

  const headers = new Headers(response.headers)
  headers.set("content-type", "text/event-stream")

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function createResponsesFetch(
  originalFetch: FetchFunction,
  options: { reasoningEffort?: "low" | "medium" | "high" }
): FetchFunction {
  return async (url, init) => {
    const urlString = typeof url === "string" ? url : url.toString()

    if (urlString.includes("/responses") && init?.body) {
      const body = JSON.parse(init.body as string)
      debug("Raw body from AI SDK:", body)

      const transformedBody = transformRequestForResponses(body, options)
      debug("Transformed request:", transformedBody)

      init.body = JSON.stringify(transformedBody)
    }

    const response = await originalFetch(url, init)

    if (urlString.includes("/responses") && response.ok) {
      if (isStreamingResponse(response)) {
        debug("Handling streaming response", null)
        return transformStreamingResponse(response)
      }

      const responseData = (await response.json()) as ResponsesAPIResponseBody
      debug("Response usage:", responseData.usage)

      const transformed = transformResponseFromResponses(responseData)

      return new Response(JSON.stringify(transformed), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }

    return response
  }
}
