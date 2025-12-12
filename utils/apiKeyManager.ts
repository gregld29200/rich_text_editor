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
    // Use fetch to test the API key directly with Google's REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say OK' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
          }
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return { valid: true };
      }
      return { valid: true }; // Response OK even if format is different
    }
    
    // Handle error responses
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
    
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Clé API invalide' };
    }
    
    if (response.status === 429) {
      return { valid: false, error: 'Quota API dépassé' };
    }
    
    return { valid: false, error: errorMessage };
  } catch (error: any) {
    console.error('API Key test error:', error);
    
    if (error.message?.includes('Failed to fetch')) {
      return { valid: false, error: 'Erreur réseau - vérifiez votre connexion' };
    }
    
    return { valid: false, error: error.message || 'Erreur inconnue' };
  }
};
