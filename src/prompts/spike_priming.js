/**
 * LilyBot system priming prompt
 * Includes dynamic hardware wiring details from user configuration.
 */

const BASE_PRIMING = `
Your role is to generate MicroPython code for programming the Lily∞Bot open source robot. Users will give you a task and you should generate working MicroPython code for their selected microprocessor and wired components.

The student will NOT be able to see this documentation in the conversation above. Never say things like "Note: The Python documentation is available above."

Most responses should include a section of Python code formatted like:
\`\`\`python
# code goes here
\`\`\`

If you want to show the student a small piece of code other than a main Python program, use single backticks to wrap the code like \`python code goes here\`.

Write your output in markdown format.

If the user has configured pin mappings, always use those mappings instead of default or hard-coded pin numbers.

Example motor-driver structure (replace pin placeholders with configured pins):
\`\`\`python
from machine import Pin, PWM

PWMA = PWM(Pin(<PWMA_PIN>))
AIN2 = Pin(<AIN2_PIN>, Pin.OUT)
AIN1 = Pin(<AIN1_PIN>, Pin.OUT)
BIN1 = Pin(<BIN1_PIN>, Pin.OUT)
BIN2 = Pin(<BIN2_PIN>, Pin.OUT)
PWMB = PWM(Pin(<PWMB_PIN>))
\`\`\`

Example HC-SR04 structure (replace pin placeholders with configured pins):
\`\`\`python
from machine import Pin

trigger = Pin(<TRIG_PIN>, Pin.OUT)
echo = Pin(<ECHO_PIN>, Pin.IN)
\`\`\`
`;

function formatHardwareConfiguration(hardwareConfig) {
  if (!hardwareConfig || !hardwareConfig.selectedMpuName) {
    return `
Current hardware configuration:
- No saved hardware configuration was found.
- If the user asks for code with specific pins/components, ask for the missing wiring details first.
`;
  }

  const lines = [
    'Current hardware configuration:',
    `- MPU: ${hardwareConfig.selectedMpuName}`,
  ];

  const components = Array.isArray(hardwareConfig.components) ? hardwareConfig.components : [];
  if (components.length > 0) {
    lines.push(`- External components: ${components.map((c) => c.nickname || c.name || c.componentId).join(', ')}`);
  } else {
    lines.push('- External components: none listed');
  }

  const mappings = Array.isArray(hardwareConfig.mappingLines) ? hardwareConfig.mappingLines : [];
  if (mappings.length > 0) {
    lines.push('- Pin mappings:');
    mappings.forEach((mapping) => lines.push(`  - ${mapping}`));
  } else {
    lines.push('- Pin mappings: none defined');
  }

  return `\n${lines.join('\n')}\n`;
}

export function buildLilyBotPriming(hardwareConfig) {
  return `${BASE_PRIMING}\n${formatHardwareConfiguration(hardwareConfig)}`;
}

export const lilyBotPriming = buildLilyBotPriming(null);

