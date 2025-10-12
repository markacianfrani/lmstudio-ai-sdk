# @cianfrani/lm-studio

LM Studio provider for the [AI SDK](https://ai-sdk.dev).

## Installation

```bash
npm install @cianfrani/lmstudio
```

## Usage

### Standard Chat API

```typescript
import { lmstudio } from '@cianfrani/lmstudio';
import { generateText, streamText } from 'ai';

const { text } = await generateText({
  model: lmstudio('qwen2.5-7b-instruct'),
  prompt: 'Hello, how are you?',
});

// Streaming
const result = streamText({
  model: lmstudio('qwen2.5-7b-instruct'),
  prompt: 'Write a story about...',
});

for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}
```

### Responses API (for reasoning models)

LM Studio's Responses API provides access to reasoning traces and structured outputs from models that support reasoning.

```typescript
import { lmstudio } from '@cianfrani/lmstudio';
import { generateText, streamText } from 'ai';

// Non-streaming with reasoning
const { text } = await generateText({
  model: lmstudio('gpt-oss', {
    api: 'responses',
    reasoningEffort: 'medium' // low, medium, or high
  }),
  prompt: 'Solve this complex problem...',
});

// Streaming with reasoning
const result = streamText({
  model: lmstudio('gpt-oss', { api: 'responses' }),
  prompt: 'Think through this step by step...',
});

for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}
```

### Performance Considerations

Based on benchmarking:
- **Chat API**: ~370% faster time-to-first-token for streaming, ~10% better throughput
- **Responses API**: ~13% faster for non-streaming completions, adds reasoning capabilities

Use the chat API for standard interactive use cases. Use the responses API when you need reasoning traces or are working with reasoning-capable models.

## API

### createLMStudio(options?)

Creates an LM Studio provider instance.

#### Options

- `baseURL?: string` - Base URL for LM Studio API. Defaults to `http://localhost:1234/v1`.
- `apiKey?: string` - API key for authentication. LM Studio typically doesn't require this.
- `headers?: Record<string, string>` - Custom headers to include in requests.
- `fetch?: FetchFunction` - Custom fetch function.
- `api?: 'chat' | 'responses'` - API to use. Defaults to `'chat'`.
- `reasoningEffort?: 'low' | 'medium' | 'high'` - Reasoning effort (only for responses API).

### lmstudio

Default LM Studio provider instance.

### lmstudio(modelId, settings?)

Creates a chat model instance.

### lmstudio.textEmbeddingModel(modelId, settings?)

Creates an embedding model instance.

## Model IDs

### Chat Models

- `qwen2.5-7b-instruct`
- `gpt-oss`
- Any other model ID supported by LM Studio

### Embedding Models

- `text-embedding-nomic-embed-text-v1.5`
- `all-MiniLM-L6-v2`
- Any other embedding model supported by LM Studio

## License

MIT
