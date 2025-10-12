import { describe, expect, it } from "vitest"

/**
 * These tests verify the request/response transformations between
 * chat completions format and LM Studio's responses API format.
 */

interface ChatCompletionsRequestBody {
  model: string
  messages: Array<{ role: string; content: string }>
  reasoning_effort?: string
  user?: string
  [key: string]: unknown
}

interface ResponsesAPIRequestBody {
  model: string
  input: string
  reasoning?: {
    effort: "low" | "medium" | "high"
  }
  [key: string]: unknown
}

interface ResponsesAPIContent {
  type: "output_text" | "reasoning_text"
  text: string
}

interface ResponsesAPIOutput {
  id: string
  type: "message" | "reasoning"
  role?: string
  status?: string
  content?: ResponsesAPIContent[]
  summary?: unknown[]
}

interface ResponsesAPIResponseBody {
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

interface ChatMessage {
  role: string
  content: string
  reasoning?: string
}

// Copy of transformation functions for unit testing
function transformRequestForResponses(
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

  if (body.reasoning_effort) {
    transformed.reasoning = {
      effort: body.reasoning_effort as "low" | "medium" | "high",
    }
  } else if (options.reasoningEffort) {
    transformed.reasoning = { effort: options.reasoningEffort }
  }

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

function transformResponseFromResponses(
  responseData: ResponsesAPIResponseBody
) {
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

describe("Request Transformation (Chat → Responses API)", () => {
  it("should transform basic chat completions request to responses format", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [{ role: "user", content: "Hello, world!" }],
    }

    const result = transformRequestForResponses(chatRequest, {})

    expect(result).toEqual({
      model: "gpt-oss",
      input: "Hello, world!",
    })
  })

  it("should join multiple messages with double newlines", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is 2+2?" },
      ],
    }

    const result = transformRequestForResponses(chatRequest, {})

    expect(result.input).toBe("You are a helpful assistant.\n\nWhat is 2+2?")
  })

  it("should add reasoning from request body", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [{ role: "user", content: "Hello" }],
      reasoning_effort: "high",
    }

    const result = transformRequestForResponses(chatRequest, {})

    expect(result.reasoning).toEqual({ effort: "high" })
  })

  it("should add reasoning from options", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [{ role: "user", content: "Hello" }],
    }

    const result = transformRequestForResponses(chatRequest, {
      reasoningEffort: "medium",
    })

    expect(result.reasoning).toEqual({ effort: "medium" })
  })

  it("should prioritize request body reasoning over options", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [{ role: "user", content: "Hello" }],
      reasoning_effort: "high",
    }

    const result = transformRequestForResponses(chatRequest, {
      reasoningEffort: "low",
    })

    expect(result.reasoning).toEqual({ effort: "high" })
  })

  it("should copy additional fields except excluded ones", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.7,
      max_tokens: 100,
      user: "test-user",
    }

    const result = transformRequestForResponses(chatRequest, {})

    expect(result.temperature).toBe(0.7)
    expect(result.max_tokens).toBe(100)
    expect(result.user).toBeUndefined()
  })

  it("should filter out empty messages", () => {
    const chatRequest: ChatCompletionsRequestBody = {
      model: "gpt-oss",
      messages: [
        { role: "user", content: "Hello" },
        { role: "user", content: "" },
        { role: "user", content: "World" },
      ],
    }

    const result = transformRequestForResponses(chatRequest, {})

    expect(result.input).toBe("Hello\n\nWorld")
  })
})

describe("Response Transformation (Responses API → Chat)", () => {
  it("should transform basic responses API response to chat format", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            { type: "output_text", text: "Hello! How can I help you?" },
          ],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result).toEqual({
      id: "resp-123",
      object: "chat.completion",
      created: 1234567890,
      model: "gpt-oss",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you?",
          },
          finish_reason: "stop",
        },
      ],
      usage: {},
    })
  })

  it("should include reasoning in message when present", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "reasoning-1",
          type: "reasoning",
          content: [
            {
              type: "reasoning_text",
              text: "Let me think about this step by step...",
            },
          ],
        },
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "The answer is 42." }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices[0].message).toEqual({
      role: "assistant",
      content: "The answer is 42.",
      reasoning: "Let me think about this step by step...",
    })
  })

  it("should handle multiple message outputs", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "First message" }],
        },
        {
          id: "msg-2",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Second message" }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices).toHaveLength(2)
    expect(result.choices[0].message.content).toBe("First message")
    expect(result.choices[1].message.content).toBe("Second message")
  })

  it("should use 'length' finish reason when status is not completed", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "incomplete",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "incomplete",
          content: [{ type: "output_text", text: "Partial response..." }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices[0].finish_reason).toBe("length")
  })

  it("should default role to 'assistant' when not specified", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          status: "completed",
          content: [{ type: "output_text", text: "Response without role" }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices[0].message.role).toBe("assistant")
  })

  it("should handle empty content array", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices[0].message.content).toBe("")
  })

  it("should pass through usage information", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Response" }],
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
        output_tokens_details: {
          reasoning_tokens: 5,
        },
      },
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.usage).toEqual({
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
      output_tokens_details: {
        reasoning_tokens: 5,
      },
    })
  })

  it("should handle missing usage information", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Response" }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.usage).toEqual({})
  })

  it("should filter out reasoning outputs from choices", () => {
    const responsesData: ResponsesAPIResponseBody = {
      id: "resp-123",
      object: "response",
      created_at: 1234567890,
      status: "completed",
      model: "gpt-oss",
      output: [
        {
          id: "reasoning-1",
          type: "reasoning",
          content: [{ type: "reasoning_text", text: "Thinking..." }],
        },
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Answer" }],
        },
      ],
    }

    const result = transformResponseFromResponses(responsesData)

    expect(result.choices).toHaveLength(1)
    expect(result.choices[0].message.content).toBe("Answer")
  })
})
