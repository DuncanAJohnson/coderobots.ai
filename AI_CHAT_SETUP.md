# AI Chat Integration Setup Guide

This guide will help you set up the AI chat functionality with OpenAI streaming via Modal.

## Prerequisites

- Node.js and npm installed
- Python 3.10+ (for Modal)
- Modal account (https://modal.com)
- OpenAI API key
- Supabase project configured

## Step 1: Install Dependencies

The required npm packages have already been added to `package.json`. Run:

```bash
npm install
```

## Step 2: Set up Modal

### 2.1 Install Modal CLI

```bash
pip install modal
```

### 2.2 Authenticate with Modal

```bash
modal setup
```

This will open a browser window to authenticate your Modal account.

### 2.3 Create OpenAI API Secret

Store your OpenAI API key as a Modal secret:

```bash
modal secret create openai-api-key OPENAI_API_KEY=sk-your-actual-openai-key-here
```

### 2.4 Deploy the Modal Function

```bash
modal deploy modal_functions/openai_stream.py
```

After deployment, Modal will display the endpoint URL. It will look like:
```
https://your-workspace--coderobots-openai-stream-chat-endpoint.modal.run
```

**Copy this URL** - you'll need it in the next step.

## Step 3: Configure Environment Variables

Your `.env.local` file has been created with Supabase credentials. Update the Modal endpoint URL:

Edit `.env.local`:
```bash
# Supabase Configuration (already configured)
VITE_SUPABASE_URL=https://nsnjxxpqplrgarsdtary.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_hgD348xX2z0xAp6Mi7vVUw_s5boGMo8

# Modal Endpoint - UPDATE THIS with your deployed URL
VITE_MODAL_ENDPOINT_URL=https://your-workspace--coderobots-openai-stream-chat-endpoint.modal.run

# Optional: Default OpenAI Model
VITE_DEFAULT_MODEL=gpt-4
```

## Step 4: Add Your Prompt Content

Two prompt files need your content:

### 4.1 SPIKE Prime Priming (`src/prompts/spike_priming.js`)

Open this file and replace the placeholder with your SPIKE Prime system prompt.

### 4.2 Coding Level Prompts (`src/prompts/codingLevels.js`)

Open this file and add your beginner, intermediate, and experienced prompts.

## Step 5: Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to test the application.

## Features Implemented

### ✅ Authentication
- Google OAuth sign-in
- Email domain validation (tufts.edu + whitelist)
- Admin detection for special features

### ✅ Session Management
- Create and switch between coding sessions
- Persistent conversation history
- Code and console state tracking

### ✅ Chat Panel
- Streaming AI responses
- Markdown rendering with code syntax highlighting
- Code snippet extraction and replacement
- Context attachment (code + console)
- Coding level selection (beginner/intermediate/experienced)
- Admin controls for model selection

### ✅ Data Logging
- All messages logged to Supabase
- Code saves tracked with source (run_device, save_to_slot, ai_replace, etc.)
- Console output logging
- User interactions tracking
- Session timestamps

### ✅ SPIKE Editor Integration
- Automatic code saving on run/save actions
- Console logging on clear
- Code replacement from AI suggestions
- Context fetching for chat

## Architecture

```
┌─────────────────┐
│   React App     │
│                 │
│  AuthContext    │──► Supabase Auth
│  SessionContext │──► Session Management
│                 │
│  ┌───────────┐  │
│  │ SPIKEEdit │  │──► Code Editor + Terminal
│  └───────────┘  │
│  ┌───────────┐  │
│  │ ChatPanel │  │──► AI Chat Interface
│  └───────────┘  │
└────────┬────────┘
         │
         ├──► Supabase (Auth, Database)
         │
         └──► Modal Serverless Function
                    │
                    └──► OpenAI API (Streaming)
```

## File Structure

```
src/
├── components/
│   ├── SPIKEEditor.jsx       # Enhanced with data logging
│   ├── ChatPanel.jsx          # AI chat with streaming
│   ├── ChatPanel.css
│   ├── AuthModal.jsx          # Google OAuth UI
│   ├── AuthModal.css
│   ├── SessionModal.jsx       # Session selection
│   └── SessionModal.css
├── contexts/
│   ├── AuthContext.jsx        # Authentication state
│   └── SessionContext.jsx     # Session state
├── services/
│   ├── supabase.js           # Supabase client
│   ├── auth.js               # Auth functions
│   ├── dataLogger.js         # Data logging
│   └── sessionManager.js     # Session CRUD
├── utils/
│   └── openaiStream.js       # SSE streaming utility
├── prompts/
│   ├── spike_priming.js      # System prompt (FILL THIS)
│   └── codingLevels.js       # Level prompts (FILL THIS)
└── App.jsx                   # Main app with providers

modal_functions/
├── openai_stream.py          # Modal serverless function
├── requirements.txt
└── README.md
```

## Troubleshooting

### Error: "VITE_MODAL_ENDPOINT_URL is not configured"
- Make sure you've deployed the Modal function and updated `.env.local`
- Restart the dev server after changing `.env.local`

### Error: "Missing Supabase environment variables"
- Check that `.env.local` exists and has both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Authentication fails
- Verify your Google OAuth is configured in Supabase dashboard
- Check that redirect URLs include your local development URL

### Modal deployment fails
- Ensure you've run `modal setup` and authenticated
- Check that you've created the `openai-api-key` secret
- Verify your OpenAI API key is valid

### No streaming response
- Check browser console for fetch errors
- Verify the Modal endpoint URL is correct
- Test the Modal endpoint directly with curl

## Admin Features

Whitelisted admin emails get additional controls:
- Model name customization in chat panel
- Access to advanced features (future)

Current admin whitelist:
- bill@crcs.works
- williamchurch17@gmail.com
- duncanjohnson99@gmail.com

## Next Steps

1. Deploy the Modal function
2. Update `.env.local` with Modal endpoint
3. Fill in prompt files with your content
4. Test authentication and session creation
5. Try sending chat messages with code context
6. Verify data logging in Supabase

## Support

For issues or questions, refer to:
- Modal docs: https://modal.com/docs
- Supabase docs: https://supabase.com/docs
- OpenAI API: https://platform.openai.com/docs

