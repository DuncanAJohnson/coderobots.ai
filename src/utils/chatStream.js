/**
 * Chat Streaming Utility
 * Model-agnostic SSE clients for the Modal serverless endpoints.
 *
 * All endpoints speak the same SSE vocabulary — `data: {json}\n\n` frames
 * with a `type` discriminator:
 *   content | progress | budget_status | usage_logged | done | error
 * (direct chat emits budget_status/usage_logged, the tutor pipeline emits
 * progress; readSseEvents handles the union.)
 */

import { supabase, isSupabaseConfigured } from '../services/supabase';
import instance from '../config/instance';

const MODAL_ENDPOINT_URL = import.meta.env.VITE_MODAL_ENDPOINT_URL;
const MODAL_BUDGET_ENDPOINT_URL = import.meta.env.VITE_MODAL_BUDGET_ENDPOINT_URL;
const MODAL_TUTOR_ENDPOINT_URL = import.meta.env.VITE_MODAL_TUTOR_ENDPOINT_URL;

/**
 * Read `data: {json}` SSE events off a fetch Response body.
 * Yields each parsed event object; returns on {type:'done'}, throws on
 * {type:'error'}. Unparseable frames are warned about and skipped.
 */
async function* readSseEvents(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE messages (lines starting with "data: ")
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6); // Remove "data: " prefix

      let data;
      try {
        data = JSON.parse(dataStr);
      } catch (parseError) {
        console.warn('Failed to parse SSE data:', dataStr, parseError);
        continue;
      }

      if (data.type === 'done') {
        return; // Stream complete
      }
      if (data.type === 'error') {
        throw new Error(data.error);
      }
      yield data;
    }
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
}

/**
 * Stream chat completion from Modal endpoint (no budget tracking)
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} model - Model name (e.g., 'gpt-5-nano', 'skolegpt-v3')
 * @param {Number} maxTokens - Maximum tokens to generate
 * @returns {AsyncGenerator} - Yields chunks of content as they arrive
 */
export async function* streamChatCompletion(messages, model = 'gpt-5-nano', maxTokens = 64000) {
  if (!MODAL_ENDPOINT_URL) {
    throw new Error('VITE_MODAL_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    const response = await postJson(MODAL_ENDPOINT_URL, {
      messages,
      model,
      max_tokens: maxTokens,
    });

    for await (const event of readSseEvents(response)) {
      if (event.type === 'content') {
        yield event.content;
      }
    }
  } catch (error) {
    console.error('Error in streamChatCompletion:', error);
    throw error;
  }
}

/**
 * Stream chat completion with budget tracking from Modal endpoint
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} model - Model name (e.g., 'gpt-5-nano', 'skolegpt-v3')
 * @param {Number} maxTokens - Maximum tokens to generate
 * @returns {AsyncGenerator} - Yields {type:'content'|'budget_status'|'usage_logged'} events
 */
export async function* streamChatCompletionWithBudget(messages, model = 'gpt-5-nano', maxTokens = 64000) {
  if (!MODAL_BUDGET_ENDPOINT_URL) {
    throw new Error('VITE_MODAL_BUDGET_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    // Get current user and auth session
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!user || !session) {
      throw new Error('User not authenticated');
    }

    const response = await postJson(MODAL_BUDGET_ENDPOINT_URL, {
      messages,
      model,
      max_tokens: maxTokens,
      user_id: user.id,
      auth_token: session.access_token,
    });

    for await (const event of readSseEvents(response)) {
      if (
        event.type === 'content' ||
        event.type === 'budget_status' ||
        event.type === 'usage_logged'
      ) {
        yield event;
      }
    }
  } catch (error) {
    console.error('Error in streamChatCompletionWithBudget:', error);
    throw error;
  }
}

/**
 * Stream a tutor-pipeline completion (chat.mode 'tutor' instances).
 * The server owns prompt assembly; the payload carries raw fields only.
 *
 * @param {Object} payload - { history, user_msg, hw_mode, level, lang,
 *   code?, console? } (+ user_id/auth_token when the deployment requires auth)
 * @returns {AsyncGenerator} - Yields {type:'content', content} and
 *   {type:'progress', stage, status, payload?} events
 */
export async function* streamTutorCompletion(payload) {
  const endpoint = MODAL_TUTOR_ENDPOINT_URL || MODAL_ENDPOINT_URL;
  if (!endpoint) {
    throw new Error('VITE_MODAL_TUTOR_ENDPOINT_URL is not configured in .env.local');
  }

  try {
    // Telemetry instances attach auth so TUTOR_REQUIRE_AUTH deployments can
    // validate the request; anonymous instances send the payload as-is.
    let authFields = {};
    if (instance.telemetry && isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (user && session) {
        authFields = { user_id: user.id, auth_token: session.access_token };
      }
    }

    const response = await postJson(endpoint, { ...payload, ...authFields });
    yield* readSseEvents(response);
  } catch (error) {
    console.error('Error in streamTutorCompletion:', error);
    throw error;
  }
}
