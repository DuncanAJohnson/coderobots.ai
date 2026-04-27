/**
 * LLM API Streaming Utility
 * Connects to Modal serverless function and handles SSE streaming.
 *
 * Two streaming functions are exposed:
 * - streamChatCompletion: raw chat passthrough to chat_endpoint (legacy / sim repo).
 * - streamTutorCompletion: server-side tutor pipeline at tutor_endpoint.
 */

const RAW_CHAT_ENDPOINT_URL = import.meta.env.VITE_MODAL_ENDPOINT_URL;
const TUTOR_ENDPOINT_URL =
  import.meta.env.VITE_MODAL_TUTOR_ENDPOINT_URL ||
  import.meta.env.VITE_MODAL_ENDPOINT_URL;

/**
 * Generic SSE response reader. Yields raw event objects with the original
 * `type` discriminator. Throws on error events. Returns on done.
 *
 * Yielded shapes:
 *   { type: 'content',  content: string }
 *   { type: 'progress', stage: string, status: string, payload?: object }
 */
async function* readSseEvents(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6);

      try {
        const data = JSON.parse(dataStr);

        if (data.type === 'done') {
          return;
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
        yield data;
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          console.warn('Failed to parse SSE data:', dataStr, parseError);
          continue;
        }
        throw parseError;
      }
    }
  }
}

/**
 * Stream a raw chat completion via the legacy chat_endpoint.
 * @param {Array} messages - Pre-assembled OpenAI-format message array.
 * @returns {AsyncGenerator<string>} - content tokens only (legacy contract).
 */
export async function* streamChatCompletion(messages) {
  if (!RAW_CHAT_ENDPOINT_URL) {
    throw new Error('VITE_MODAL_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    const response = await fetch(RAW_CHAT_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    for await (const event of readSseEvents(response)) {
      if (event.type === 'content') {
        yield event.content;
      }
      // progress / unknown events are dropped on this legacy path
    }
  } catch (error) {
    console.error('Error in streamChatCompletion:', error);
    throw error;
  }
}

/**
 * Stream the server-side tutor pipeline via tutor_endpoint.
 * Yields typed events so callers can render progress (chain-of-thought) alongside content.
 *
 * @param {Object} payload
 * @param {Array<{role: string, content: string}>} payload.history
 * @param {string} payload.user_msg
 * @param {string} payload.hw_mode - 'spike' | 'microbit' | 'lego' | 'esp32'
 * @param {string} payload.level   - 'beginner' | 'intermediate' | 'experienced'
 * @param {string} [payload.code]
 * @param {string} [payload.console]
 * @returns {AsyncGenerator<{type:'content',content:string}|{type:'progress',stage:string,status:string,payload?:object}>}
 */
export async function* streamTutorCompletion(payload) {
  if (!TUTOR_ENDPOINT_URL) {
    throw new Error('VITE_MODAL_TUTOR_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    const response = await fetch(TUTOR_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    yield* readSseEvents(response);
  } catch (error) {
    console.error('Error in streamTutorCompletion:', error);
    throw error;
  }
}
