import { describe, expect, it } from "vitest"
import { ensureToolParametersType } from "../src/responses/tools-utils"

describe("ensureToolParametersType", () => {
  it("should add type: object to parameters if missing", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "test",
          parameters: {
            properties: { foo: { type: "string" } },
          },
        },
      },
    ]

    const result = ensureToolParametersType(tools)

    expect(result[0]).toEqual({
      type: "function",
      function: {
        name: "test",
        parameters: {
          type: "object",
          properties: { foo: { type: "string" } },
        },
      },
    })
  })

  it("should not modify parameters that already have type: object", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "test",
          parameters: {
            type: "object",
            properties: { foo: { type: "string" } },
          },
        },
      },
    ]

    const result = ensureToolParametersType(tools)

    expect(result[0]).toEqual(tools[0])
  })

  it("should handle tools without parameters", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "test",
          description: "test function",
        },
      },
    ]

    const result = ensureToolParametersType(tools)

    expect(result[0]).toEqual(tools[0])
  })

  it("should handle non-function tools", () => {
    const tools = [
      {
        type: "mcp",
        server_url: "https://example.com",
      },
    ]

    const result = ensureToolParametersType(tools)

    expect(result[0]).toEqual(tools[0])
  })

  it("should handle empty array", () => {
    const result = ensureToolParametersType([])

    expect(result).toEqual([])
  })

  it("should handle null and undefined values", () => {
    const tools = [null, undefined, "invalid"]

    const result = ensureToolParametersType(tools)

    expect(result).toEqual([null, undefined, "invalid"])
  })

  it("should handle multiple tools", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "tool1",
          parameters: { prop: "value" },
        },
      },
      {
        type: "function",
        function: {
          name: "tool2",
          parameters: { type: "object", prop: "value" },
        },
      },
    ]

    const result = ensureToolParametersType(tools)

    expect(result[0]).toMatchObject({
      function: { parameters: { type: "object" } },
    })
    expect(result[1]).toEqual(tools[1])
  })

  it("should mutate parameters in place", () => {
    const params = { properties: { foo: { type: "string" } } }
    const tools = [
      {
        type: "function",
        function: {
          name: "test",
          parameters: params,
        },
      },
    ]

    ensureToolParametersType(tools)

    expect(params).toHaveProperty("type", "object")
  })
})
