/**
 * API Key Manager
 * Handles storage and retrieval of API keys from localStorage
 * Provides fallback to environment variables
 */

const STORAGE_KEY = 'gemini_api_key';

/**
 * Get the API key from localStorage or environment variable
 * Priority: 1. localStorage, 2. environment variable
 */
export const getApiKey = (): string | null => {
  // First try localStorage
  const storedKey = localStorage.getItem(STORAGE_KEY);
  if (storedKey) {
    return storedKey;
  }
  
  // Fallback to environment variable
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  return null;
};

/**
 * Save API key to localStorage
 */
export const saveApiKey = (apiKey: string): void => {
  if (apiKey && apiKey.trim()) {
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
  }
};

/**
 * Remove API key from localStorage
 */
export const clearApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Check if an API key is available (either in storage or env)
 */
export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};

/**
 * Validate API key format (basic validation)
 * Gemini API keys typically start with 'AIza'
 */
export const isValidApiKeyFormat = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  const trimmed = apiKey.trim();
  
  // Basic format check - Gemini keys start with 'AIza' and are ~39 chars
  if (trimmed.length < 30 || trimmed.length > 50) {
    return false;
  }
  
  if (!trimmed.startsWith('AIza')) {
    return false;
  }
  
  return true;
};

/**
 * Get masked version of API key for display
 * Shows first 4 and last 4 characters
 */
export const getMaskedApiKey = (): string => {
  const key = getApiKey();
  if (!key) {
    return '';
  }
  
  if (key.length <= 8) {
    return '****';
  }
  
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

/**
 * Test if the API key works by making a simple request
 * Returns true if the key is valid, false otherwise
 */
export const testApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Import GoogleGenAI dynamically to avoid issues
    const { GoogleGenAI } = await import('@google/genai');
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Make a minimal test request
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say "OK" and nothing else.',
      config: {
        maxOutputTokens: 10,
      }
    });
    
    if (response.text) {
      return { valid: true };
    }
    
    return { valid: false, error: 'No response from API' };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    
    if (errorMessage.includes('API key')) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (errorMessage.includes('quota')) {
      return { valid: false, error: 'API quota exceeded' };
    }
    
    return { valid: false, error: errorMessage };
  }
};
