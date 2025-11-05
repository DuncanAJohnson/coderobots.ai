# Modal Deployment Instructions

## Setup

1. Install Modal CLI:
```bash
pip install modal
```

2. Authenticate with Modal:
```bash
modal setup
```

3. Create OpenAI API key secret:
```bash
modal secret create openai-api-key OPENAI_API_KEY=sk-your-api-key-here
```

## Deploy

```bash
modal deploy modal_functions/openai_stream.py
```

After deployment, Modal will provide a URL for the `chat_endpoint`. 
Copy this URL and add it to your `.env.local` file as `VITE_MODAL_ENDPOINT_URL`.

The URL will look like:
`https://your-workspace--coderobots-openai-stream-chat-endpoint.modal.run`

## API Notes

This service uses the OpenAI Responses API (not the legacy Chat Completions API).
The service:
- Accepts messages in the old format (array of `{role, content}` objects)
- Converts system messages to `instructions` parameter
- Converts user/assistant messages to the new `input` format
- Streams responses using Server-Sent Events (SSE)
- Maintains compatibility with the existing frontend

