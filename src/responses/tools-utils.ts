/**
 * Ensures tool parameters have type: "object" as required by LM Studio.
 * AI SDK omits this field, but LM Studio requires it.
 */
export function ensureToolParametersType(tools: unknown[]): unknown[] {
  return tools.map((tool) => {
    if (!tool || typeof tool !== "object") {
      return tool
    }
    if (!("type" in tool) || tool.type !== "function") {
      return tool
    }
    if (
      !("function" in tool) ||
      !tool.function ||
      typeof tool.function !== "object"
    ) {
      return tool
    }
    if (!("parameters" in tool.function)) {
      return tool
    }

    const params = tool.function.parameters
    if (params && typeof params === "object" && !("type" in params)) {
      ;(params as Record<string, unknown>).type = "object"
    }

    return tool
  })
}
