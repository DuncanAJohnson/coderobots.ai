# OpenAI Responses API Migration Notes

## Changes Made

### Backend (`modal_functions/openai_stream.py`)

#### API Endpoint Change
- **Old:** `client.chat.completions.create()`
- **New:** `client.responses.create()`

#### Request Parameters
- **Old Format:**
  ```python
  {
    "model": "gpt-5-nano",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "max_tokens": 10000,
    "stream": True
  }
  ```

- **New Format:**
  ```python
  {
    "model": "gpt-5-nano",
    "instructions": "combined system messages",
    "input": [
      {"type": "message", "role": "user", "content": "..."},
      {"type": "message", "role": "assistant", "content": "..."}
    ],
    "max_output_tokens": 10000,
    "stream": True,
    "text": {"format": {"type": "text"}}
  }
  ```

#### Message Conversion Logic
1. System messages → `instructions` parameter (combined with `\n\n`)
2. User/assistant messages → `input` array with new structure
3. Each input message has `type: "message"` wrapper

#### Streaming Response Handling
- **Old:** `chunk.choices[0].delta.content`
- **New:** Event-based with `event.type == "response.output_item.delta"`
  - Check for `event.delta.type == "output_text"`
  - Extract text from `event.delta.text`

### Frontend (`src/utils/openaiStream.js`)
- **No changes required** - SSE format preserved for compatibility

## Testing Checklist

After deploying the updated Modal function:

1. [ ] Test basic chat message
2. [ ] Test with system prompt (coding level)
3. [ ] Test with code context attached
4. [ ] Test with console logs attached
5. [ ] Test multi-turn conversation
6. [ ] Test error handling
7. [ ] Verify streaming works smoothly
8. [ ] Check model name `gpt-5-nano` works

## Deployment Steps

1. Deploy to Modal:
   ```bash
   modal deploy modal_functions/openai_stream.py
   ```

2. Test the endpoint with a simple curl command:
   ```bash
   curl -X POST https://your-modal-url \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [
         {"role": "system", "content": "You are a helpful assistant."},
         {"role": "user", "content": "Hello!"}
       ],
       "model": "gpt-5-nano"
     }'
   ```

3. Monitor for any errors in Modal logs

## Benefits of This Migration

1. **Future-proof:** Uses the latest OpenAI API
2. **Multi-provider ready:** Keeps conversation management client-side
3. **Flexible:** Easier to add additional providers (Claude, Gemini)
4. **Compatible:** Frontend requires no changes

## Rollback Plan

If issues arise, the old implementation is preserved in git history:
```bash
git log --oneline modal_functions/openai_stream.py
git show <commit-hash>:modal_functions/openai_stream.py
```

