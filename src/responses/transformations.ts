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
      key !== "model"
    ) {
      transformed[key] = body[key]
    }
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
  // Extract reasoning and message outputs separately
  const reasoningOutput = responseData.output.find(
    (o) => o.type === "reasoning"
  )
  const messageOutputs = responseData.output.filter((o) => o.type === "message")

  const reasoningText = reasoningOutput?.content?.find(
    (c) => c.type === "reasoning_text"
  )?.text

  return {
    id: responseData.id,
    object: "chat.completion" as const,
    created: responseData.created_at,
    model: responseData.model,
    choices: messageOutputs.map((output, index) => {
      const outputText =
        output.content?.find((c) => c.type === "output_text")?.text ?? ""

      const message: ChatMessage = {
        role: output.role ?? "assistant",
        content: outputText,
      }

      // Include reasoning if present
      if (reasoningText) {
        message.reasoning = reasoningText
      }

      return {
        index,
        message,
        finish_reason:
          output.status === "completed"
            ? ("stop" as const)
            : ("length" as const),
      }
    }),
    usage: responseData.usage ?? {},
  }
}
