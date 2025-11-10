import { Platform } from 'react-native';

/**
 * Get the API base URL based on environment and platform
 * This function is shared between all API services to ensure consistent configuration
 */
const DEFAULT_RENDER_API_URL = 'https://accountability-f4hg.onrender.com';

export const getApiBaseUrl = () => {
  // Check for environment variables (available with Expo/React Native)
  if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // For web, check for window.env which could be set in index.html
  if (typeof window !== 'undefined' && window.env && window.env.API_URL) {
    return window.env.API_URL;
  }
  
  // Default based on current environment and platform
  if (process.env.NODE_ENV === 'production') {
    // Default production API host (Render)
    return DEFAULT_RENDER_API_URL;
  } else {
    // In development, use the appropriate localhost URL based on platform
    const PORT = 8000; // Standardize on port 8000 for all environments
    
    if (Platform.OS === 'web') {
      return `http://localhost:${PORT}`;
    } else if (Platform.OS === 'android') {
      return `http://10.0.2.2:${PORT}`; // Special IP for Android emulator
    } else {
      // iOS simulator or physical device
      return `http://localhost:${PORT}`;
    }
  }
};

// Define a shared API_BASE_URL for all services to use
export const API_BASE_URL = getApiBaseUrl();

// Log API URL configuration detail for debugging
console.log(`API configuration details:
- Base URL: ${API_BASE_URL} ${API_BASE_URL === DEFAULT_RENDER_API_URL ? '(Render default)' : ''}
- Platform: ${Platform.OS}
- Environment: ${process.env.NODE_ENV || 'development'}
- Running on: ${typeof window !== 'undefined' ? 'Browser' : 'Native'}
`);

// Check if API URL is accessible
fetch(`${API_BASE_URL}/health-check`, { method: 'HEAD' })
  .then(response => {
    console.log(`API health check: ${response.status === 200 ? 'Success' : 'Failed'} (${response.status})`);
  })
  .catch(error => {
    console.warn(`API connection test failed: ${error.message}. This might indicate connectivity issues.`);
  });

// Helper function to add logging for API requests
export const logApiRequest = (endpoint: string, method: string = 'GET', params?: any) => {
  console.log(`[API] ${method} request to: ${endpoint}`);
  if (params) {
    console.log(`[API] Parameters:`, params);
  }
};

// Helper function to log API responses
export const logApiResponse = (endpoint: string, status: number, data: any) => {
  console.log(`[API] Response from ${endpoint} (status: ${status})`);
  if (data) {
    console.log(`[API] Response data:`, 
      typeof data === 'object' ? 
        `Keys: ${Object.keys(data).join(', ')}` : 
        `Data: ${String(data).substring(0, 100)}...`);
  }
};

// Helper function for timeout-based fetch with abort controller
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`[NETWORK] Beginning fetch to ${url}`);
    
    // Add CORS headers to all requests
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
        'Accept': 'application/json',
      },
      mode: 'cors' as RequestMode, // Explicitly set CORS mode
      credentials: 'omit' as RequestCredentials, // Changed from 'same-origin' to 'omit' to fix CORS issues
    };
    
    // Log the full request details
    console.log(`[NETWORK] Fetch options:`, fetchOptions);
    
    // Use standard fetch API for all platforms (including web)
    // This simplifies CORS handling and prevents different behaviors
    console.log(`[NETWORK] Using standard fetch API for all platforms (including web)`);
    
    // For debugging during development - log the URL being requested
    if (url.includes('/analytics/')) {
      console.log(`[ANALYTICS] Making request to analytics endpoint: ${url}`);
      console.log(`[ANALYTICS] Request options:`, JSON.stringify({
        method: options.method || 'GET',
        headers: fetchOptions.headers,
        mode: fetchOptions.mode,
        credentials: fetchOptions.credentials
      }, null, 2));
    }
    
    // Standard fetch for non-web platforms
    const response = await fetch(url, fetchOptions);
    console.log(`[NETWORK] Fetch completed with status: ${response.status}`);
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[NETWORK] Fetch error for ${url}:`, error);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    
    // Add more context to the error
    throw new Error(`Network error when fetching ${url}: ${error.message || 'Unknown error'}`);
  }
};
