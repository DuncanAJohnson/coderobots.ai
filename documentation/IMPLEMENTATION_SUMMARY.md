# AI Usage Budget System - Implementation Summary

## Overview

Successfully implemented a comprehensive AI usage tracking and budget enforcement system that monitors token usage, calculates costs, and enforces spending limits based on user access levels.

## What Was Implemented

### 1. Database Layer
**File:** `supabase/migrations/20241014_ai_usage_setup.sql`

- Created `ai_usage` table to track all AI requests with:
  - Token counts (input, output, cached input, reasoning)
  - Cost calculations in USD
  - Model names and timestamps
- Implemented Row Level Security (RLS):
  - Users can only read their own records
  - Only service role can insert records (prevents manipulation)
- Added `access_level` support via user metadata
- Created helper function `get_user_access_level(user_id)` for easy access level checks

### 2. Modal Backend Function
**File:** `modal_functions/openai_stream_with_budget.py`

Features:
- Streams OpenAI responses with real-time token tracking
- Authenticates users via Supabase auth tokens
- Calculates costs using model-specific pricing:
  - **gpt-5**: $1.25/$0.13/$10.00 (input/cached/output per 1M tokens)
  - **gpt-5-mini**: $0.25/$0.03/$2.00
  - **gpt-5-nano**: $0.05/$0.01/$0.40
- Logs usage to Supabase after each request
- Checks budget status and returns it to frontend
- Budget enforcement:
  - **EN1 users**: Unlimited gpt-5-nano, limited gpt-5-mini/gpt-5
  - **Standard users**: Limited usage across all models

Configuration:
- `EN1_WEEKLY_BUDGET`: Default $10.00/week
- `STANDARD_WEEKLY_BUDGET`: Default $2.00/week
- Configurable via Modal environment variables

### 3. Frontend Services

#### AI Usage Service
**File:** `src/services/aiUsage.js`

Functions:
- `fetchUserUsage()` - Retrieves all usage records for current user
- `getWeeklyUsage()` - Calculates current week's usage (Mon-Sun ET)
- `getAllTimeUsage()` - Calculates lifetime usage statistics
- `getUserAccessLevel()` - Gets user's access level from Supabase
- `getWeekBoundariesET()` - Calculates week boundaries in Eastern Time
- `getNextMondayET()` - For countdown timers
- `calculateUsageStats()` - Aggregates usage by model
- Utility formatters for currency and numbers

#### Streaming Utility Update
**File:** `src/utils/openaiStream.js`

Added:
- `streamChatCompletionWithBudget()` - New function that:
  - Passes user authentication to Modal
  - Handles budget status events
  - Returns both content and budget information
- Kept original `streamChatCompletion()` for backward compatibility

### 4. Frontend Components

#### ChatPanel Updates
**File:** `src/components/ChatPanel.jsx`

Added:
- Model selection dropdown (gpt-5-nano, gpt-5-mini, gpt-5)
- Default model: gpt-5-nano
- Integration with budget-aware streaming function
- Budget error detection and modal display
- User access level tracking
- Admin users can still use custom model names

#### Budget Error Modal
**Files:** 
- `src/components/BudgetErrorModal.jsx`
- `src/components/BudgetErrorModal.css`

Features:
- Different messages for EN1 vs Standard users
- EN1: Suggests switching to gpt-5-nano
- Standard: Shows countdown to next Monday reset
- Real-time countdown timer (days, hours, minutes, seconds)
- Dismissible modal

#### AI Usage Modal
**Files:**
- `src/components/AIUsageModal.jsx`
- `src/components/AIUsageModal.css`

Features:
- Displays "This Week" and "All Time" usage
- Breaks down by model:
  - Request count
  - Input/output/cached/reasoning tokens
  - Total cost in USD
- Shows access level and budget limits
- Professional table layout with totals row
- Real-time data fetching on modal open

#### TitleBar Update
**File:** `src/components/TitleBar.jsx`

Added:
- "AI USAGE" button in top navigation bar
- Opens AI Usage Modal on click
- Accessible from any screen

### 5. Configuration

Updated environment files:
- `.envEN1.local` - Added `VITE_MODAL_BUDGET_ENDPOINT_URL`
- `.envSHOWCASE.local` - Added `VITE_MODAL_BUDGET_ENDPOINT_URL`

Created documentation:
- `modal_functions/BUDGET_SETUP.md` - Complete setup guide for Modal deployment

## How It Works

### User Flow

1. **User sends message:**
   - Selects model from dropdown (gpt-5-nano, gpt-5-mini, gpt-5)
   - Types message and clicks send
   - Frontend calls budget-aware Modal endpoint with auth token

2. **Modal processes request:**
   - Verifies user authentication
   - Fetches user's access level from Supabase
   - Streams AI response from OpenAI
   - Captures usage data (tokens)
   - Calculates cost based on token counts
   - Logs usage to `ai_usage` table
   - Calculates current week's total spend
   - Checks if user is over budget
   - Returns budget status to frontend

3. **Frontend handles response:**
   - Displays streamed response to user
   - Receives budget status
   - If over budget, shows Budget Error Modal:
     - EN1 users: "Use gpt-5-nano"
     - Standard users: "Budget exceeded, resets in X days"

4. **User views usage:**
   - Clicks "AI USAGE" button in title bar
   - Sees breakdown by model for this week and all time
   - Sees total costs and token counts
   - Can track spending against budget

### Budget Enforcement

The system allows users to **go over budget by one AI call**. Budget is checked **after** the request completes, not before. This approach:
- Prevents partial failures
- Simplifies implementation
- Provides better UX (users aren't blocked mid-conversation)
- Notifies users immediately after exceeding budget

### Access Levels

Users have an `access_level` field in their Supabase user metadata:

**EN1 Users** (`access_level: 'en1'`):
- Unlimited gpt-5-nano usage
- Weekly budget for gpt-5-mini and gpt-5
- Suggested for education environments

**Standard Users** (`access_level: 'standard'`):
- Weekly budget applies to all models
- Lower overall spending limit

## Next Steps

### Deployment Checklist

1. **Database Setup:**
   ```bash
   # Run migration in Supabase SQL editor
   # or via psql
   psql your_database < supabase/migrations/20241014_ai_usage_setup.sql
   ```

2. **Set User Access Levels:**
   ```sql
   -- Example: Set EN1 access for specific users
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "en1"}'::jsonb
   WHERE email LIKE '%@tufts.edu';
   ```

3. **Create Modal Secrets:**
   ```bash
   # OpenAI API key
   modal secret create openai-api-key OPENAI_API_KEY=sk-...
   
   # Supabase credentials (use SERVICE ROLE key!)
   modal secret create supabase-credentials \
     SUPABASE_URL=https://xxx.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=eyJ...
   
   # Optional: Custom budget limits
   modal secret create budget-config \
     EN1_WEEKLY_BUDGET=15.00 \
     STANDARD_WEEKLY_BUDGET=3.00
   ```

4. **Deploy Modal Function:**
   ```bash
   cd modal_functions
   modal deploy openai_stream_with_budget.py
   ```

5. **Update Environment Variables:**
   - Copy the deployed endpoint URL
   - Update `.envEN1.local` or `.envSHOWCASE.local`
   - Set `VITE_MODAL_BUDGET_ENDPOINT_URL=<your_endpoint_url>`

6. **Test the System:**
   - Start the frontend
   - Send AI messages
   - Check AI Usage modal
   - Test budget enforcement by lowering limits temporarily

### Optional Enhancements

Future improvements could include:
- Email notifications when users approach budget limits
- Admin dashboard to view all users' usage
- Adjustable budgets per user (instead of global limits)
- Usage analytics and reporting
- Budget rollover for unused allocation
- Team/class-level budgets

## Files Created/Modified

### Created Files
- `supabase/migrations/20241014_ai_usage_setup.sql`
- `modal_functions/openai_stream_with_budget.py`
- `modal_functions/BUDGET_SETUP.md`
- `src/services/aiUsage.js`
- `src/components/BudgetErrorModal.jsx`
- `src/components/BudgetErrorModal.css`
- `src/components/AIUsageModal.jsx`
- `src/components/AIUsageModal.css`

### Modified Files
- `src/components/ChatPanel.jsx` - Added model selector and budget integration
- `src/components/TitleBar.jsx` - Added AI Usage button
- `src/utils/openaiStream.js` - Added budget-aware streaming function
- `.envEN1.local` - Added budget endpoint URL
- `.envSHOWCASE.local` - Added budget endpoint URL

## Security Considerations

✅ **Implemented:**
- RLS policies prevent users from viewing others' usage
- RLS policies prevent users from inserting fake usage records
- Only service role can write to `ai_usage` table
- User authentication via Supabase JWT tokens
- Access level stored server-side (can't be spoofed)
- Modal verifies auth tokens before processing

✅ **Best Practices:**
- Service role key stored only in Modal secrets
- Anon key used in frontend (limited permissions)
- Budget calculations done server-side
- Usage logging happens in Modal (can't be bypassed)

## Support

For issues or questions:
1. Check `modal_functions/BUDGET_SETUP.md` for setup instructions
2. Review Modal logs: `modal logs openai_stream_with_budget.py`
3. Check Supabase logs for database issues
4. Query `ai_usage` table to verify data is being logged

## Summary

The AI Usage Budget System is fully implemented and ready for deployment. It provides:
- ✅ Token usage tracking across all models
- ✅ Cost calculation and monitoring
- ✅ Two-tier access system (EN1 vs Standard)
- ✅ User-friendly budget notifications
- ✅ Comprehensive usage statistics
- ✅ Secure, server-side enforcement
- ✅ Easy configuration and management

The old Modal endpoint (`openai_stream.py`) remains untouched and functional for backward compatibility.

