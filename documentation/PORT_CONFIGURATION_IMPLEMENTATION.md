# Port Configuration Feature Implementation

## Overview

This feature automatically analyzes SPIKE PRIME Python code to determine which sensors and motors should be connected to which ports (A-F) on the hub. The analysis happens in two contexts:

1. **Automatic Analysis in Chat**: When the AI bot provides Python code snippets, they are automatically analyzed
2. **Manual Analysis in Editor**: Users can click "View Port Configuration" to analyze the current code in the editor

## Implementation Details

### Backend (Modal Functions)

#### 1. Port Configuration Analyzer (`modal_functions/port_config_analyzer.py`)
- Serverless function that accepts Python code and returns port configuration JSON
- Uses OpenAI's gpt-5-nano model (no budget tracking)
- Returns format: `{"a": "motor", "b": "color_sensor", "c": "none", ...}`
- Component types: `motor`, `color_sensor`, `distance_sensor`, `force_sensor`, `none`
- Non-streaming for simplicity and reliability
- Includes JSON validation to ensure all ports (a-f) are present

**Deployment:**
```bash
modal deploy modal_functions/port_config_analyzer.py
```

Add the endpoint URL to `.env.local` as `VITE_MODAL_PORT_CONFIG_URL`

#### 2. System Prompt (`src/prompts/port_configuration.js`)
- Instructs the AI to analyze SPIKE PRIME code
- Identifies component types from Python patterns like `Motor(Port.A)`, `ColorSensor(Port.B)`, etc.
- Returns only valid JSON without explanations

### Frontend Components

#### 3. Port Configuration Utility (`src/utils/portConfigStream.js`)
- Handles HTTP requests to the Modal endpoint
- Parses and validates responses
- Error handling and logging

#### 4. Port Configuration Modal (`src/components/PortConfigModal.jsx`)
- Visual display of hub with 6 port positions (A-F)
- Shows component icons at each port based on JSON configuration
- Hub centered with components arranged around it
- Responsive design for different screen sizes

**Features:**
- Hub image in center
- 6 port slots positioned around the hub
- Component icons with labels
- Port labels (A-F)
- Close button and backdrop click to dismiss

#### 5. Placeholder Images (`src/assets/spike/*.svg`)
Created SVG placeholders for:
- `hub.svg` - SPIKE Prime hub (blue with center circle)
- `motor.svg` - Motor (gray with circular face)
- `color_sensor.svg` - Color sensor (orange with RGB circles)
- `distance_sensor.svg` - Distance sensor (green with ultrasonic eyes)
- `force_sensor.svg` - Force sensor (purple with touch pad)
- `none.svg` - Empty port (dashed border with "---")

### Updated Components

#### 6. ChatPanel Component (`src/components/ChatPanel.jsx`)

**New State:**
- `portConfigs` - Map storing port configurations by code snippet key
- `portConfigLoading` - Set tracking which snippets are being analyzed
- `portConfigModalOpen` - Modal visibility state
- `currentPortConfig` - Currently viewed port configuration

**New Functions:**
- `analyzeCodeSnippet(codeText, codeKey)` - Triggers analysis for a code snippet
- `handleViewPortConfig(codeKey)` - Opens modal with port configuration
- `closePortConfigModal()` - Closes the modal

**Modified Rendering:**
- Code blocks now wrapped in `<div>` for vertical layout
- Python code blocks from bot messages automatically trigger analysis
- "View Port Configuration" button appears below "View Code Snippet"
- Button shows spinner while loading, becomes active when ready
- Button is purple (`#7B1FA2`) to distinguish from code button

#### 7. CodeTabs Component (`src/components/CodeTabs.jsx`)

**New Props:**
- `onViewPortConfig` - Handler for port config button click
- `isPortConfigLoading` - Loading state for the button

**New UI:**
- "View Port Configuration" button added next to "+ New Code"
- Shows spinner and "Analyzing..." text when loading
- Purple styling to match chat panel button
- Only renders if `onViewPortConfig` prop is provided

#### 8. SPIKEEditor Component (`src/components/SPIKEEditor.jsx`)

**New State:**
- `portConfigModalOpen` - Modal visibility
- `currentPortConfig` - Port configuration to display
- `isPortConfigLoading` - Loading state for button

**New Functions:**
- `handleViewPortConfig()` - Gets current code, analyzes it, opens modal
- `closePortConfigModal()` - Closes the modal

**Integration:**
- Passes `onViewPortConfig` and `isPortConfigLoading` to CodeTabs
- Renders PortConfigModal at component level
- Shows alert if no code to analyze

### Styling

#### 9. ChatPanel.css
- `.port-config-btn` - Purple button for port config in chat bubbles
- `.spinner-small` - Small spinning loader for inline buttons
- Disabled state styling

#### 10. CodeTabs.css
- `.code-tab-port-config` - Purple button for port config in tabs bar
- `.spinner-small` - Spinner for loading state
- `@keyframes spin` - Rotation animation

#### 11. PortConfigModal.css
- Full-screen modal with backdrop
- Centered white box with header, content, and actions
- Hub container positioned absolutely in center
- Port slots positioned absolutely around the hub
- Component images with shadows and borders
- Responsive design with media queries for mobile

## User Experience

### In Chat Panel

1. User asks AI for help with SPIKE PRIME code
2. AI responds with Python code in a code block
3. System automatically detects Python code and triggers analysis
4. "View Port Configuration" button appears below "View Code Snippet"
5. Button shows spinner while analyzing (typically 1-2 seconds)
6. Once analysis complete, button becomes active
7. User clicks button to see visual port configuration
8. Modal displays hub with component icons at correct ports

### In Code Editor

1. User writes or edits Python code in the editor
2. User clicks "View Port Configuration" button (next to "+ New Code")
3. Button shows spinner and changes to gray
4. System analyzes the current code
5. Modal opens automatically when analysis complete
6. Shows which components should be connected to which ports

## Error Handling

- Missing environment variable: Clear error message
- Network errors: Logged to console, default "none" configuration returned
- Invalid code: AI returns default configuration
- Empty code: Alert shown to user
- Modal endpoint failures: Alert shown, error logged

## Performance Considerations

- Automatic analysis uses `setTimeout(..., 0)` to avoid blocking render
- Analysis only triggered once per unique code snippet
- Loading state prevents duplicate requests
- Modal function is lightweight (gpt-5-nano, ~500 tokens max)
- No budget tracking overhead for analysis requests

## Configuration Required

Add to `.env.local`:
```
VITE_MODAL_PORT_CONFIG_URL=https://your-workspace--coderobots-port-config-port-config-endpoint.modal.run
```

## Future Enhancements

Possible improvements:
1. Cache analysis results in localStorage
2. Add ability to manually edit port configuration
3. Show wiring diagram lines connecting components to ports
4. Animate component placement
5. Export configuration as JSON or image
6. Support for multiple hub configurations
7. Validation warnings if incompatible components detected

