// API Service for handling production and development API calls

/**
 * Get the dynamic API base URL based on current host
 * @returns API base URL
 */
const getApiBaseUrl = (): string => {
  // In development, proxy handles API calls
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  
  // In production, dynamically determine API URL based on current host
  const currentHost = window.location.hostname;
  const apiPort = '5000';
  
  // Use the same protocol as the current page
  const protocol = window.location.protocol;
  
  return `${protocol}//${currentHost}:${apiPort}`;
};

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (should start with /)
 * @returns Full URL for the API call
 */
export const getApiUrl = (endpoint: string): string => {
  // In development, use relative URLs (proxy will handle them)
  if (process.env.NODE_ENV === 'development') {
    return endpoint;
  }
  
  // In production, use dynamic API base URL
  const apiBaseUrl = getApiBaseUrl();
  console.log(`🔧 Dynamic API Base URL: ${apiBaseUrl}`);
  console.log(`🔧 Current Host: ${window.location.hostname}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  return `${apiBaseUrl}${endpoint}`;
};

/**
 * Enhanced fetch function that automatically handles production/development URLs
 * @param endpoint - The API endpoint (should start with /)
 * @param options - Standard fetch options
 * @returns Promise with fetch response
 */
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = getApiUrl(endpoint);
  
  // Default options for all API calls
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  console.log(`🌐 API Call: ${url}`);
  
  try {
    const response = await fetch(url, finalOptions);
    console.log(`📡 API Response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error(`❌ API Error: ${error}`);
    console.error(`🔗 Failed URL: ${url}`);
    console.error(`⚙️ Options:`, finalOptions);
    throw error;
  }
};

export default apiFetch;
