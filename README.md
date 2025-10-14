# @cianfrani/lm-studio

LM Studio provider for the [AI SDK](https://ai-sdk.dev).

## Installation

```bash
npm install @cianfrani/lmstudio
```

## Usage

### Chat API

```typescript
import { lmstudio } from '@cianfrani/lmstudio';
import { generateText } from 'ai';

const { text } = await generateText({
  model: lmstudio('qwen2.5-7b-instruct'),
  prompt: 'Hello, how are you?',
});
```

### Responses API (Beta)

The responses API provides access to reasoning traces and structured outputs from models that support reasoning.

#### Installation

```bash
npm install @cianfrani/lmstudio@responses
```

#### Usage

```typescript
import { lmstudio } from '@cianfrani/lmstudio';
import { generateText } from 'ai';

const { text } = await generateText({
  model: lmstudio('gpt-oss', { api: 'responses', reasoningEffort: 'medium' }),
  prompt: 'Solve this complex problem...',
});
```

## API

### createLMStudio(options?)

Creates an LM Studio provider instance.

#### Options

- `baseURL?: string` - Base URL for LM Studio API. Defaults to `http://localhost:1234/v1`.
- `apiKey?: string` - API key for authentication. LM Studio typically doesn't require this.
- `headers?: Record<string, string>` - Custom headers to include in requests.
- `fetch?: FetchFunction` - Custom fetch function.
- `api?: 'chat' | 'responses'` - API to use. Defaults to `'chat'`. (Responses API requires beta version)
- `reasoningEffort?: 'low' | 'medium' | 'high'` - Reasoning effort for responses API.

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
