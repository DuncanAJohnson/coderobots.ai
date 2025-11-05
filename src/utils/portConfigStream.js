/**
 * Port Configuration Analyzer Utility
 * Calls Modal serverless function to analyze SPIKE PRIME code and return port configuration
 * Model-agnostic implementation supporting multiple providers
 */

import { getAvailableModels } from '../config/models';

const MODAL_PORT_CONFIG_URL = import.meta.env.VITE_MODAL_PORT_CONFIG_URL;

/**
 * Analyze SPIKE PRIME code and get port configuration
 * @param {String} code - Python code to analyze
 * @param {String} model - Model name to use (default: first available model)
 * @returns {Promise<Object>} - Port configuration object
 */
export async function analyzePortConfiguration(code, model = null) {
  // Default to first available model if not specified
  if (!model) {
    const availableModels = getAvailableModels();
    model = availableModels.length > 0 ? availableModels[0] : 'gpt-5-nano';
  }
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

