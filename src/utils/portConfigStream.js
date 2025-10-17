/**
 * Port Configuration Analyzer Utility
 * Calls Modal serverless function to analyze SPIKE PRIME code and return port configuration
 */

const MODAL_PORT_CONFIG_URL = import.meta.env.VITE_MODAL_PORT_CONFIG_URL;

/**
 * Analyze SPIKE PRIME code and get port configuration
 * @param {String} code - Python code to analyze
 * @param {String} model - OpenAI model to use (default: gpt-5-nano)
 * @returns {Promise<Object>} - Port configuration object
 */
export async function analyzePortConfiguration(code, model = 'gpt-5-nano') {
  if (!MODAL_PORT_CONFIG_URL) {
    throw new Error('VITE_MODAL_PORT_CONFIG_URL is not configured in .env.local');
  }

  try {
    const response = await fetch(MODAL_PORT_CONFIG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.port_config;
  } catch (error) {
    console.error('Error analyzing port configuration:', error);
    throw error;
  }
}

