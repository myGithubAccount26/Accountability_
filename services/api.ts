import { Activity } from "@/components/ActivityForm";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, logApiRequest, logApiResponse, fetchWithTimeout } from './apiConfig';

// Cache configuration
const CACHE_KEY = 'activities_cache';
const CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes in milliseconds

// Log the API base URL
console.log(`API is configured to use: ${API_BASE_URL}`);

// Helper function to save to cache
const saveToCache = async (data: Activity[]) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
    console.log('📦 Data saved to cache');
  } catch (e) {
    console.error('Failed to save to cache:', e);
  }
};

// Helper function to get from cache
const getFromCache = async (): Promise<Activity[] | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (!cachedData) return null;
    
    const parsed = JSON.parse(cachedData);
    const now = Date.now();
    
    // Check if cache is still valid - using shorter expiry for better data consistency
    if (now - parsed.timestamp < (CACHE_EXPIRY / 2)) {
      console.log('📦 Using cached data');
      return parsed.data;
    } else {
      console.log('📦 Cache expired');
      return null;
    }
  } catch (e) {
    console.error('Failed to get from cache:', e);
    return null;
  }
};

// Get all activities with pagination and caching
export const fetchActivities = async (forceRefresh = false, limit = 20, offset = 0): Promise<Activity[]> => {
  try {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = await getFromCache();
      if (cachedData) {
        console.log(`📦 Using ${cachedData.length} activities from cache`);
        return cachedData;
      }
    }
    
    console.log(`🔍 Fetching activities from: ${API_BASE_URL}/get-event-data`);
    console.log(`Current environment: ${Platform.OS}`);
    
    try {
      // Add timestamp to prevent caching issues and include pagination
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/get-event-data?limit=${limit}&offset=${offset}&_t=${timestamp}`;
      
      logApiRequest(url, 'GET', { limit, offset, timestamp });
      const response = await fetchWithTimeout(url, {}, 15000);
      
      logApiResponse(url, response.status, 'Response received');
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log(`Received response of length: ${text.length}`);
      
      // Add additional debugging for first part of response
      if (text.length > 0) {
        console.log(`Response preview: ${text.substring(0, 100)}...`);
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Response was not valid JSON');
        throw jsonError;
      }
      
      if (Array.isArray(data)) {
        console.log(`Parsed data successfully. Found ${data.length} activities.`);
        
        // Save to cache only if we actually got data
        if (data.length > 0) {
          saveToCache(data);
        }
        
        return data;
      } else {
        console.error('Response is not an array:', data);
        
        // Try to recover if the API returned an object instead of an array
        if (data && typeof data === 'object') {
          // Check if there's an activities array in the response
          if (Array.isArray(data.activities)) {
            console.log('Found activities array in response object');
            return data.activities;
          }
          
          // If it's an object but not what we expect, log it
          console.log('Unexpected data structure:', JSON.stringify(data).substring(0, 200));
        }
        
        return [];
      }
    } catch (fetchError) {
      console.error('Error during fetch:', fetchError);
      
      // Try to get data from cache even on error
      const cachedData = await getFromCache();
      if (cachedData && cachedData.length > 0) {
        console.log(`📦 Using ${cachedData.length} activities from cache after fetch error`);
        return cachedData;
      }
      
      // Create a test array to help debug rendering
      const testData = [{
        Activity: "Test Activity",
        Category: "Test Category",
        Date: new Date().toISOString().split('T')[0],
        Start_Time: "09:00",
        End_Time: "10:00",
        Points: 10,
        Notes: "This is a test activity created when the API call failed",
        Tags: "test,debug",
        activity_id: 9999
      }];
      
      return testData;
    }
  } catch (error) {
    console.error('🔴 Error in fetchActivities:', error);
    return [];  // Return empty array instead of throwing to prevent crashes
  }
};

// Create a new activity and update cache
export const createActivity = async (activity: Partial<Activity>): Promise<Activity> => {
  try {
    console.log('📤 Sending activity to server:', JSON.stringify(activity, null, 2));
    
    // Ensure all required fields are present
    const requiredFields = ['Activity', 'Category', 'Date', 'Start_Time', 'End_Time'];
    const missingFields = requiredFields.filter(field => !activity[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Log the URL we're sending to
    console.log(`Sending to endpoint: ${API_BASE_URL}/submit-activity`);
    
    // Add a timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const endpoint = `${API_BASE_URL}/submit-activity?_t=${timestamp}`;
    
    // Use XMLHttpRequest for detailed debugging on web
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        
        // Add timeout
        xhr.timeout = 10000; // 10 seconds
        
        xhr.ontimeout = function() {
          reject(new Error('Request timed out after 10 seconds'));
        };
        
        xhr.onload = async function() {
          console.log(`📥 Response received with status: ${xhr.status}`);
          console.log(`Response length: ${xhr.responseText.length}`);
          
          if (xhr.responseText.length > 0) {
            console.log(`Response preview: ${xhr.responseText.substring(0, 100)}...`);
          }
          
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch (e) {
            console.error(`🔴 Error parsing response: ${e}`);
            console.error(`Raw response: ${xhr.responseText}`);
            reject(new Error(`Failed to parse response: ${e}`));
            return;
          }
          
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Activity created successfully');
            
            // Check if we got a valid activity object in the response
            if (data && data.activity) {
              console.log('Server returned activity object:', data.activity);
              
              // Use the activity object from the response
              const newActivity = data.activity;
              
              // Update the cache with new activity and invalidate after creation
              try {
                // Instead of updating cache, invalidate it to force a refresh
                await AsyncStorage.removeItem(CACHE_KEY);
                console.log('🗑️ Cache invalidated after creating activity');
              } catch (cacheError) {
                console.error('Failed to invalidate cache:', cacheError);
              }
              
              resolve(newActivity);
            } else {
              // If we got a successful response but no activity data, create a fallback
              console.log('Response had no activity data, creating fallback response');
              const fallbackActivity = { 
                ...activity,
                status: 'success',
                message: 'Activity added (server response was empty)'
              };
              
              // Invalidate cache to force a refresh
              try {
                await AsyncStorage.removeItem(CACHE_KEY);
                console.log('🗑️ Cache invalidated after creating activity');
              } catch (cacheError) {
                console.error('Failed to invalidate cache:', cacheError);
              }
              
              resolve(fallbackActivity);
            }
          } else {
            console.error('🔴 Server returned error:', data);
            reject(new Error(data?.message || `API error: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.error('🔴 Network error sending activity');
          reject(new Error('Network error - check if the server is running'));
        };
        
        const requestBody = JSON.stringify(activity);
        console.log('Sending request with body:', requestBody);
        xhr.send(requestBody);
      });
    }
    
    // Regular fetch for non-web platforms
    console.log('Using fetch API for non-web platform');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(activity),
    });
    
    // Get the raw response text
    const responseText = await response.text();
    console.log(`Response text: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    // Parse the response
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (e) {
      console.error(`🔴 JSON parse error:`, e);
      throw new Error(`Failed to parse response: ${e}`);
    }
    
    if (!response.ok) {
      console.error('🔴 Server returned error:', data);
      throw new Error(data?.message || `API error: ${response.status}`);
    }
    
    // Check if we got a valid activity object in the response
    if (data && data.activity) {
      console.log('Server returned activity object:', data.activity);
      
      // Invalidate cache to force a refresh on next fetch
      try {
        await AsyncStorage.removeItem(CACHE_KEY);
        console.log('🗑️ Cache invalidated after creating activity');
      } catch (cacheError) {
        console.error('Failed to invalidate cache:', cacheError);
      }
      
      return data.activity;
    }
    
    // If we got a successful response but no activity object, create a fallback
    console.log('Response had no activity object, creating fallback response');
    const fallbackActivity = { 
      ...activity,
      status: 'success',
      message: 'Activity added (server response was empty)'
    };
    
    // Invalidate cache to force a refresh
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('🗑️ Cache invalidated after creating activity');
    } catch (cacheError) {
      console.error('Failed to invalidate cache:', cacheError);
    }
    
    return fallbackActivity;
  } catch (error) {
    console.error('🔴 Error creating activity:', error);
    throw error;
  }
};

// Update an existing activity
export const updateActivity = async (activityId: number, fields: Record<string, any>): Promise<any> => {
  try {
    console.log(`Updating activity ${activityId} with fields:`, fields);
    
    // Create a batch update approach - one request per field
    const updatePromises = Object.entries(fields).map(([field, value]) => {
      console.log(`Updating field ${field} to`, value);
      
      return fetch(`${API_BASE_URL}/update-cell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field,
          value,
          id: activityId,
        }),
      }).then(async response => {
        const data = await response.json();
        if (!response.ok) {
          console.error(`Failed to update ${field}:`, data);
          throw new Error(data.message || `Failed to update ${field}`);
        }
        return { field, response: data };
      });
    });
    
    // Execute all update requests in parallel
    const results = await Promise.all(updatePromises);
    console.log('Update completed successfully:', results);
    return results;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// Delete an activity
export const deleteActivity = async (activityId: number): Promise<any> => {
  try {
    console.log(`Deleting activity ${activityId}`);
    
    const response = await fetch(`${API_BASE_URL}/delete-row`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: activityId,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Server returned error during deletion:', data);
      throw new Error(data.message || `API error: ${response.status}`);
    }
    
    console.log('Delete operation successful:', data);
    return data;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

// Helper function to handle retries for API calls
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`API call failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        // Wait before next retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError;
};