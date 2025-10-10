/**
 * OpenAI Streaming Utility
 * Connects to Modal serverless function and handles SSE streaming
 */

const MODAL_ENDPOINT_URL = import.meta.env.VITE_MODAL_ENDPOINT_URL;

/**
 * Stream chat completion from Modal endpoint
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} model - OpenAI model name
 * @param {Number} maxTokens - Maximum tokens to generate
 * @returns {AsyncGenerator} - Yields chunks of content as they arrive
 */
export async function* streamChatCompletion(messages, model = 'gpt-5-nano', maxTokens = 10000) {
  if (!MODAL_ENDPOINT_URL) {
    throw new Error('VITE_MODAL_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    const response = await fetch(MODAL_ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (lines starting with "data: ")
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6); // Remove "data: " prefix
          
          try {
            const data = JSON.parse(dataStr);
            
            if (data.type === 'content') {
              yield data.content;
            } else if (data.type === 'done') {
              return; // Stream complete
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', dataStr, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in streamChatCompletion:', error);
    throw error;
  }
}

