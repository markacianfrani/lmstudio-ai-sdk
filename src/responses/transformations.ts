import { ensureToolParametersType } from "./tools-utils"
import type {
  ChatCompletionsRequestBody,
  ChatMessage,
  ResponsesAPIRequestBody,
  ResponsesAPIResponseBody,
} from "./types"

/**
 * Transform chat completions request body to responses API format
 * Converts messages array to single input string and adds reasoning configuration
 */
export function transformRequestForResponses(
  body: ChatCompletionsRequestBody,
  options: { reasoningEffort?: "low" | "medium" | "high" }
): ResponsesAPIRequestBody {
  const input = body.messages
    .map((msg) => (typeof msg.content === "string" ? msg.content : ""))
    .filter(Boolean)
    .join("\n\n")

  const transformed: ResponsesAPIRequestBody = {
    model: body.model,
    input,
  }

  // Add reasoning from provider options or request body
  if (body.reasoning_effort) {
    transformed.reasoning = {
      effort: body.reasoning_effort as "low" | "medium" | "high",
    }
  } else if (options.reasoningEffort) {
    transformed.reasoning = { effort: options.reasoningEffort }
  }

  // Copy over any other fields except messages and user
  for (const key of Object.keys(body)) {
    if (
      key !== "messages" &&
      key !== "user" &&
      key !== "reasoning_effort" &&
      key !== "model" &&
      key !== "tools"
    ) {
      transformed[key] = body[key]
    }
  }

  // Flatten nested tools structure for responses API and ensure type: "object"
  if (body.tools && Array.isArray(body.tools)) {
    transformed.tools = ensureToolParametersType(body.tools).map(
      (tool: unknown) => {
        if (
          tool &&
          typeof tool === "object" &&
          "type" in tool &&
          tool.type === "function" &&
          "function" in tool &&
          tool.function &&
          typeof tool.function === "object"
        ) {
          return {
            type: "function",
            name: "name" in tool.function ? tool.function.name : undefined,
            description:
              "description" in tool.function
                ? tool.function.description
                : undefined,
            parameters:
              "parameters" in tool.function ? tool.function.parameters : {},
          }
        }
        return tool
      }
    )
  }

  return transformed
}

/**
 * Transform responses API response body to chat completions format
 * Extracts reasoning and message outputs into standard OpenAI format
 */
export function transformResponseFromResponses(
  responseData: ResponsesAPIResponseBody
) {
  const reasoningOutput = responseData.output.find(
    (o) => o.type === "reasoning"
  )
  const messageOutputs = responseData.output.filter((o) => o.type === "message")
  const functionCalls = responseData.output.filter(
    (o) => o.type === "function_call"
  )

  const reasoningText = reasoningOutput?.content?.find(
    (c) => c.type === "reasoning_text"
  )?.text

  // Handle function calls - convert to tool_calls format
  const toolCalls =
    functionCalls.length > 0
      ? functionCalls.map((fc) => ({
          id: fc.call_id || fc.id,
          type: "function" as const,
          function: {
            name: fc.name || "",
            arguments: fc.arguments || "{}",
          },
        }))
      : undefined

  // If no message outputs yet, return choice with tool calls or empty
  const choices =
    messageOutputs.length === 0
      ? [
          {
            index: 0,
            message: {
              role: "assistant" as const,
              content: toolCalls ? null : "",
              ...(toolCalls && { tool_calls: toolCalls }),
            },
            finish_reason:
              functionCalls.length > 0 ? ("tool_calls" as const) : null,
          },
        ]
      : messageOutputs.map((output, index) => {
          const outputText =
            output.content?.find((c) => c.type === "output_text")?.text ?? ""

          const message: ChatMessage = {
            role: output.role ?? "assistant",
            content: outputText,
          }

          if (reasoningText) {
            message.reasoning = reasoningText
          }

          if (toolCalls) {
            message.tool_calls = toolCalls
            message.content = null
          }

          return {
            index,
            message,
            finish_reason:
              output.status === "completed"
                ? ("stop" as const)
                : ("length" as const),
          }
        })

  return {
    id: responseData.id,
    object: "chat.completion" as const,
    created: responseData.created_at,
    model: responseData.model,
    choices,
    usage: responseData.usage ?? {},
  }
}
