# AI Usage Budget System - Quick Start Guide

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Database Setup
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/20241014_ai_usage_setup.sql
-- Copy and paste the entire file into the SQL editor and execute
```

### Step 2: Set User Access Levels
```sql
-- Give EN1 access to all @tufts.edu users
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "en1"}'::jsonb
WHERE email LIKE '%@tufts.edu';

-- Set standard access for others
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "standard"}'::jsonb
WHERE email NOT LIKE '%@tufts.edu';
```

### Step 3: Configure Modal Secrets
```bash
# Required secrets
modal secret create openai-api-key \
  OPENAI_API_KEY=your_openai_key

modal secret create supabase-credentials \
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Optional: Override default budgets
modal secret create budget-config \
  EN1_WEEKLY_BUDGET=10.00 \
  STANDARD_WEEKLY_BUDGET=2.00
```

### Step 4: Deploy Modal Function
```bash
cd modal_functions
modal deploy openai_stream_with_budget.py
```

Copy the endpoint URL from the output (something like):
```
https://your-name--coderobots-openai-stream-budget-chat-endpoint-with-budget.modal.run
```

### Step 5: Update Environment
Edit `.envEN1.local` or `.envSHOWCASE.local`:
```bash
VITE_MODAL_BUDGET_ENDPOINT_URL=<paste_your_endpoint_url_here>
```

### Step 6: Test
```bash
npm run dev
```

1. Login to the app
2. Send a message using the AI chat
3. Click "AI USAGE" button in the top bar
4. Verify usage is being tracked

## 📊 Default Configuration

### Budget Limits (Weekly, Monday-Sunday Eastern Time)
- **EN1 Users:** $10.00/week for gpt-5-mini/gpt-5, unlimited gpt-5-nano
- **Standard Users:** $2.00/week across all models

### Token Pricing (per 1M tokens)
| Model | Input | Cached Input | Output |
|-------|-------|--------------|--------|
| gpt-5 | $1.25 | $0.13 | $10.00 |
| gpt-5-mini | $0.25 | $0.03 | $2.00 |
| gpt-5-nano | $0.05 | $0.01 | $0.40 |

## 🧪 Testing Budget Enforcement

To test the budget system without waiting for real usage:

```sql
-- Add fake usage to test budget limits (as admin)
INSERT INTO ai_usage (user_id, timestamp, model, input_tokens, output_tokens, cached_input_tokens, reasoning_tokens, cost_usd)
VALUES 
  ('user_uuid_here', NOW(), 'gpt-5-mini', 1000000, 500000, 0, 0, 1.25);
-- This adds $1.25 of usage
```

Then try sending a message and you should see the budget warning.

## 🔍 Monitoring Usage

### Check Individual User Usage
```sql
SELECT 
  model,
  COUNT(*) as requests,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(cost_usd) as total_cost
FROM ai_usage
WHERE user_id = 'user_uuid'
  AND timestamp >= date_trunc('week', NOW())
GROUP BY model;
```

### Check All Users This Week
```sql
SELECT 
  u.email,
  SUM(a.cost_usd) as weekly_spend,
  COUNT(*) as request_count
FROM ai_usage a
JOIN auth.users u ON a.user_id = u.id
WHERE a.timestamp >= date_trunc('week', NOW())
GROUP BY u.email
ORDER BY weekly_spend DESC;
```

## ⚙️ Adjusting Budgets

### Change Global Limits
Update Modal secret:
```bash
modal secret create budget-config \
  EN1_WEEKLY_BUDGET=20.00 \
  STANDARD_WEEKLY_BUDGET=5.00
```

Then redeploy:
```bash
modal deploy openai_stream_with_budget.py
```

### Change Individual User Access Level
```sql
-- Upgrade user to EN1
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "en1"}'::jsonb
WHERE email = 'student@example.edu';

-- Downgrade to standard
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_level": "standard"}'::jsonb
WHERE email = 'user@example.com';
```

## 🐛 Troubleshooting

### Users can't send messages
- Check Modal logs: `modal logs`
- Verify Supabase credentials are correct
- Ensure `VITE_MODAL_BUDGET_ENDPOINT_URL` is set

### Usage not being tracked
- Verify the `ai_usage` table exists
- Check Modal has service role key (not anon key)
- Check Modal logs for errors

### Budget not enforcing
- Verify user has `access_level` set in metadata
- Check current week's usage in database
- Ensure budget calculations are working (check Modal logs)

### AI Usage modal shows no data
- Check browser console for errors
- Verify user is authenticated
- Check RLS policies are correct

## 📚 Full Documentation

- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Modal Setup:** See `modal_functions/BUDGET_SETUP.md`
- **Database Schema:** See `supabase/migrations/20241014_ai_usage_setup.sql`

## 💡 Tips

1. **Start with higher budgets** and lower them based on actual usage
2. **Monitor weekly spending** to adjust budgets appropriately
3. **Use gpt-5-nano by default** - it's significantly cheaper
4. **Set EN1 access for trusted users** (students, staff)
5. **Standard access for public/demo users**

## 🎯 Key Features

✅ Real-time token usage tracking  
✅ Automatic cost calculation  
✅ Weekly budget enforcement  
✅ Two-tier access system (EN1/Standard)  
✅ Detailed usage analytics  
✅ User-friendly error messages  
✅ Secure server-side enforcement  

---

**Need help?** Check the logs:
- Frontend: Browser console (F12)
- Backend: `modal logs`
- Database: Supabase logs panel

