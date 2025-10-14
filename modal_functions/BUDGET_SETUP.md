# AI Usage Budget System - Modal Setup Guide

## Overview

The `openai_stream_with_budget.py` Modal function provides AI streaming with token usage tracking and budget enforcement.

## Modal Secrets Required

You need to create two Modal secrets:

### 1. openai-api-key
```bash
modal secret create openai-api-key OPENAI_API_KEY=your_openai_api_key_here
```

### 2. supabase-credentials
```bash
modal secret create supabase-credentials \
  SUPABASE_URL=your_supabase_url \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** Use the **service role key** (not the anon key) for Supabase so the Modal function can:
- Insert usage records into the `ai_usage` table
- Read user metadata for access level checks
- Bypass RLS policies for usage logging

## Environment Variables (Optional)

You can also set budget limits as environment variables:

```bash
modal secret create budget-config \
  EN1_WEEKLY_BUDGET=10.00 \
  STANDARD_WEEKLY_BUDGET=2.00
```

### Default Values

If not set, the following defaults apply:
- `EN1_WEEKLY_BUDGET`: $10.00 per week
- `STANDARD_WEEKLY_BUDGET`: $2.00 per week

## Token Pricing

The system uses the following pricing (per 1M tokens):

### gpt-5
- Input: $1.25
- Cached Input: $0.13
- Output: $10.00

### gpt-5-mini
- Input: $0.25
- Cached Input: $0.03
- Output: $2.00

### gpt-5-nano
- Input: $0.05
- Cached Input: $0.01
- Output: $0.40

## Budget Rules

### EN1 Users (access_level = 'en1')
- **gpt-5-nano**: Unlimited usage ♾️
- **gpt-5-mini & gpt-5**: Limited to `EN1_WEEKLY_BUDGET`

### Standard Users (access_level = 'standard')
- **All models**: Limited to `STANDARD_WEEKLY_BUDGET`

## Deployment

Deploy the Modal function:

```bash
modal deploy modal_functions/openai_stream_with_budget.py
```

After deployment, copy the endpoint URL and update your `.env.local` file:

```
VITE_MODAL_BUDGET_ENDPOINT_URL=https://your-username--coderobots-openai-stream-budget-chat-endpoint-with-budget.modal.run
```

## Database Setup

Run the Supabase migration to create the `ai_usage` table:

```sql
-- Apply the migration
psql your_database < supabase/migrations/20241014_ai_usage_setup.sql
```

Or use the Supabase dashboard to run the migration.

## Setting User Access Levels

To set a user's access level, update their user metadata in Supabase:

```sql
-- Set user to EN1 access
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "en1"}'::jsonb
WHERE email = 'user@example.edu';

-- Set user to standard access
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "standard"}'::jsonb
WHERE email = 'user@example.com';
```

Or use the Supabase dashboard to edit user metadata.

## Testing

1. Deploy the Modal function
2. Run the Supabase migration
3. Set a user's access level
4. Start the frontend and test AI chat
5. Check the AI Usage modal to see token counts and costs
6. Test budget enforcement by lowering the budget limits

## Monitoring

You can query usage data from Supabase:

```sql
-- Check total usage for a user
SELECT 
  model,
  COUNT(*) as requests,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(cost_usd) as total_cost
FROM ai_usage
WHERE user_id = 'user_uuid_here'
GROUP BY model;

-- Check this week's spending
SELECT 
  user_id,
  SUM(cost_usd) as weekly_spend
FROM ai_usage
WHERE timestamp >= date_trunc('week', NOW())
GROUP BY user_id
ORDER BY weekly_spend DESC;
```

