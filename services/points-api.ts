import { Platform } from 'react-native';
import { Activity } from '@/components/ActivityForm';
import { API_BASE_URL, logApiRequest, logApiResponse, fetchWithTimeout } from './apiConfig';

// Log that we're using the shared API URL
console.log(`Points API is configured to use: ${API_BASE_URL}`);

// Helper function to handle API errors consistently
const handleApiError = (endpoint: string, error: any, mockData: any = null) => {
  console.error(`Error in ${endpoint}:`, error);
  if (mockData !== null) {
    console.log(`Returning mock data for ${endpoint}`);
    return mockData;
  }
  throw error;
};

export interface PointsBreakdown {
  base: number;
  duration_bonus: number;
  completion_bonus: number;
  jackpot: number;
  multiplier: number;
  exercise_bonus?: number;
}

export interface PointsResponse {
  total_points: number;
}

export interface Transaction {
  id: number;
  date: string;
  points: number;
  activity_id: number;
  description: string;
  breakdown?: PointsBreakdown;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total_points: number;
}

export interface Reward {
  id: number;
  date: string;
  name?: string;
  reward_name?: string; // Backend uses reward_name instead of name
  points_cost: number;
  description: string;
}

export interface RewardsResponse {
  rewards: Reward[];
  total_points: number;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  reward?: Reward;
  points_remaining?: number;
  remaining_points?: number; // For compatibility with both API versions
  transaction_id?: number;
}

// Exercise tracking types
export interface ExerciseDetails {
  id?: number;
  activity_id?: number;
  exercise_type: string;
  intensity?: number;
  distance?: number;
  distance_unit?: string;
  weight?: number;
  weight_unit?: string;
  sets?: number;
  reps?: number;
  calories?: number;
  heart_rate?: number;
}

export interface ExerciseActivity extends Activity {
  exercise_details?: ExerciseDetails;
}

export interface ExercisePointsResult {
  new_total: number;
  difference: number;
  breakdown: PointsBreakdown;
}

export interface ExerciseActionResponse {
  status: string;
  message: string;
  activity?: ExerciseActivity;
  points?: ExercisePointsResult;
}

/**
 * Get the current total points
 */
export const getTotalPoints = async (forceRefresh: boolean = false): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/points/total`);
    const data = await response.json() as PointsResponse;
    return data.total_points;
  } catch (error) {
    console.error('Error fetching total points:', error);
    // Return a default value for development/demo purposes
    return 1250;
  }
};

/**
 * Get points transaction history
 */
export const getTransactions = async (
  limit: number = 20,
  offset: number = 0
): Promise<Transaction[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/points/transactions?limit=${limit}&offset=${offset}`
    );
    const data = await response.json() as TransactionsResponse;
    return data.transactions || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Return some mock data for development/demo purposes
    return [
      {
        id: 1,
        date: new Date().toISOString(),
        points: 50,
        activity_id: 123,
        description: 'Completed activity: Reading'
      },
      {
        id: 2,
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        points: 75,
        activity_id: 124,
        description: 'Completed activity: Exercise'
      }
    ];
  }
};

/**
 * Get rewards history
 */
export const getRewards = async (
  limit: number = 20,
  offset: number = 0
): Promise<Reward[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/points/rewards?limit=${limit}&offset=${offset}`
    );
    const data = await response.json() as RewardsResponse;
    return data.rewards || [];
  } catch (error) {
    console.error('Error fetching rewards:', error);
    // Return empty array for now
    return [];
  }
};

/**
 * Purchase a reward with points
 */
export const purchaseReward = async (
  rewardName: string,
  pointsCost: number,
  description: string = ''
): Promise<PurchaseResponse> => {
  try {
    console.log(`Making purchase API call to ${API_BASE_URL}/points/purchase`);
    
    // Simple POST request - this worked in previous version
    const response = await fetch(`${API_BASE_URL}/points/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reward_name: rewardName,
        points_cost: pointsCost,
        description
      }),
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    
    const result = await response.json() as PurchaseResponse;
    console.log(`Purchase API response:`, result);
    return result;
  } catch (error) {
    console.error('Error purchasing reward:', error);
    throw error; // Just re-throw the original error for better debugging
  }
};

/**
 * Get available rewards for the shop
 */
export interface AvailableReward {
  id: number;
  name: string;
  points_cost: number;
  description: string;
  image_url?: string;
  category?: string;
}

export const getAvailableRewards = async (): Promise<AvailableReward[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/points/available-rewards`);
    const data = await response.json();
    
    if (Array.isArray(data.rewards)) {
      return data.rewards;
    } else {
      console.error('Invalid available rewards data format:', data);
      
      // Return mock data for testing
      return [
        {
          id: 1,
          name: "Netflix movie night",
          points_cost: 300,
          description: "Two hours of Netflix with snacks"
        },
        {
          id: 2,
          name: "Sleep in",
          points_cost: 500,
          description: "Sleep in an extra hour on a weekday"
        },
        {
          id: 3,
          name: "Restaurant dinner",
          points_cost: 1000,
          description: "Dinner at a restaurant of your choice"
        },
        {
          id: 4,
          name: "Video game session",
          points_cost: 200,
          description: "One hour of guilt-free gaming"
        }
      ];
    }
  } catch (error) {
    console.error('Error fetching available rewards:', error);
    
    // Return mock data for testing
    return [
      {
        id: 1,
        name: "Netflix movie night",
        points_cost: 300,
        description: "Two hours of Netflix with snacks"
      },
      {
        id: 2,
        name: "Sleep in",
        points_cost: 500,
        description: "Sleep in an extra hour on a weekday"
      },
      {
        id: 3,
        name: "Restaurant dinner",
        points_cost: 1000,
        description: "Dinner at a restaurant of your choice"
      },
      {
        id: 4,
        name: "Video game session",
        points_cost: 200,
        description: "One hour of guilt-free gaming"
      }
    ];
  }
};

/**
 * Exercise-specific API functions
 */

/**
 * Fetch exercise activities (activities with exercise details)
 */
export const fetchExerciseActivities = async (
  filters: Record<string, string> = {},
  limit: number = 50,
  offset: number = 0
): Promise<ExerciseActivity[]> => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    // Add pagination
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const url = `${API_BASE_URL}/exercises?${queryParams.toString()}`;
    console.log(`Fetching exercise activities from ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as ExerciseActivity[];
  } catch (error) {
    console.error('Error fetching exercise activities:', error);
    // Return empty array if there's an error
    return [];
  }
};

/**
 * Get exercise details for a specific activity
 */
export const getExerciseDetails = async (activityId: number): Promise<ExerciseActivity> => {
  try {
    console.log(`Fetching exercise details for activity ${activityId}`);
    const response = await fetch(`${API_BASE_URL}/exercise/${activityId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as ExerciseActivity;
  } catch (error) {
    console.error('Error fetching exercise details:', error);
    throw error;
  }
};

/**
 * Add exercise details to an existing activity
 */
export const addExerciseDetails = async (
  activityId: number, 
  exerciseDetails: ExerciseDetails
): Promise<ExerciseActionResponse> => {
  try {
    console.log(`Adding exercise details to activity ${activityId}`);
    const response = await fetch(`${API_BASE_URL}/exercise/${activityId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exerciseDetails),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json() as ExerciseActionResponse;
  } catch (error) {
    console.error('Error adding exercise details:', error);
    throw error;
  }
};

/**
 * Update exercise details for an existing activity
 */
export const updateExerciseDetails = async (
  activityId: number, 
  exerciseDetails: Partial<ExerciseDetails>
): Promise<ExerciseActionResponse> => {
  try {
    console.log(`Updating exercise details for activity ${activityId}`);
    const response = await fetch(`${API_BASE_URL}/exercise/${activityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exerciseDetails),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json() as ExerciseActionResponse;
  } catch (error) {
    console.error('Error updating exercise details:', error);
    throw error;
  }
};

/**
 * Delete exercise details for an activity
 */
export const deleteExerciseDetails = async (activityId: number): Promise<ExerciseActionResponse> => {
  try {
    console.log(`Deleting exercise details for activity ${activityId}`);
    const response = await fetch(`${API_BASE_URL}/exercise/${activityId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json() as ExerciseActionResponse;
  } catch (error) {
    console.error('Error deleting exercise details:', error);
    throw error;
  }
};

/**
 * Get list of available exercise types
 */
export const getExerciseTypes = async (): Promise<string[]> => {
  try {
    console.log(`Fetching exercise types from ${API_BASE_URL}/exercise-types`);
    const response = await fetch(`${API_BASE_URL}/exercise-types`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as string[];
  } catch (error) {
    console.error('Error fetching exercise types:', error);
    // Return default exercise types if the API call fails
    return [
      "Running",
      "Walking",
      "Cycling",
      "Swimming",
      "Weightlifting",
      "HIIT",
      "Yoga",
      "Pilates",
      "Calisthenics",
      "Team Sports"
    ];
  }
};

/**
 * Journal & Mood Tracking types and API functions
 */

export interface MoodData {
  id?: number;
  date: string;
  mood_score: number;
  energy_level?: number;
  stress_level?: number;
  sleep_hours?: number;
  sleep_quality?: number;  // Added sleep quality on 1-10 scale
  bedtime?: string;        // Optional time went to bed (HH:MM)
  wake_time?: string;      // Optional time woke up (HH:MM)
  notes?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id?: number;
  date: string;
  title: string;
  content: string;
  tags?: string;
  mood_id?: number;
  activity_id?: number;
  created_at?: string;
  updated_at?: string;
  mood?: MoodData;
}

export interface MoodOption {
  score: number;
  label: string;
  color: string;
}

/**
 * Get mood options for consistent UI
 */
export const getMoodOptions = async (): Promise<MoodOption[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/moods/mood-options`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as MoodOption[];
  } catch (error) {
    return handleApiError('getMoodOptions', error, [
      { score: 1, label: "Terrible", color: "#d32f2f" },
      { score: 2, label: "Bad", color: "#f44336" },
      { score: 3, label: "Poor", color: "#ff9800" },
      { score: 4, label: "Mediocre", color: "#fbc02d" },
      { score: 5, label: "Neutral", color: "#ffeb3b" },
      { score: 6, label: "Fair", color: "#c0ca33" },
      { score: 7, label: "Good", color: "#8bc34a" },
      { score: 8, label: "Very Good", color: "#4caf50" },
      { score: 9, label: "Great", color: "#009688" },
      { score: 10, label: "Excellent", color: "#2196f3" }
    ]);
  }
};

/**
 * Get journal entries
 */
export const getJournalEntries = async (
  limit: number = 20,
  offset: number = 0,
  filters: Record<string, string> = {}
): Promise<JournalEntry[]> => {
  try {
    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await fetch(`${API_BASE_URL}/journals?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as JournalEntry[];
  } catch (error) {
    return handleApiError('getJournalEntries', error, [
      {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        title: "Sample Journal Entry",
        content: "This is a sample journal entry when the API is unavailable.",
        tags: "sample, mock",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mood: {
          mood_score: 7,
          energy_level: 6,
          stress_level: 4
        }
      }
    ]);
  }
};

/**
 * Get a specific journal entry
 */
export const getJournalEntry = async (journalId: number): Promise<JournalEntry> => {
  try {
    const response = await fetch(`${API_BASE_URL}/journal/${journalId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as JournalEntry;
  } catch (error) {
    // For specific entry requests, we should throw the error rather than return mock data
    console.error(`Error fetching journal entry ${journalId}:`, error);
    throw error;
  }
};

/**
 * Add a new journal entry
 */
export const addJournalEntry = async (entry: JournalEntry): Promise<JournalEntry> => {
  try {
    const response = await fetch(`${API_BASE_URL}/journal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.entry;
  } catch (error) {
    console.error('Error adding journal entry:', error);
    throw error;
  }
};

/**
 * Update an existing journal entry
 */
export const updateJournalEntry = async (journalId: number, entry: Partial<JournalEntry>): Promise<JournalEntry> => {
  try {
    const response = await fetch(`${API_BASE_URL}/journal/${journalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.entry;
  } catch (error) {
    console.error(`Error updating journal entry ${journalId}:`, error);
    throw error;
  }
};

/**
 * Delete a journal entry
 */
export const deleteJournalEntry = async (journalId: number): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/journal/${journalId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting journal entry ${journalId}:`, error);
    throw error;
  }
};

/**
 * Get mood logs
 */
export const getMoodLogs = async (
  limit: number = 30,
  offset: number = 0,
  filters: Record<string, string> = {}
): Promise<MoodData[]> => {
  try {
    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await fetch(`${API_BASE_URL}/moods?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json() as MoodData[];
  } catch (error) {
    return handleApiError('getMoodLogs', error, [
      {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        mood_score: 7,
        energy_level: 6,
        stress_level: 4,
        notes: "Mock mood data",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
  }
};

/**
 * Add a new mood log
 */
export const addMoodLog = async (mood: MoodData): Promise<MoodData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mood),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.mood;
  } catch (error) {
    console.error('Error adding mood log:', error);
    throw error;
  }
};

/**
 * Update an existing mood log
 */
export const updateMoodLog = async (moodId: number, mood: Partial<MoodData>): Promise<MoodData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mood/${moodId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mood),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.mood;
  } catch (error) {
    console.error(`Error updating mood log ${moodId}:`, error);
    throw error;
  }
};

/**
 * Analytics Dashboard Types and API Functions
 */

export interface TimePeriodsStats {
  period: string;
  label: string;
  activity_count?: number;
  total_points?: number;
  total_hours?: number;
  avg_mood?: number;
  avg_energy?: number;
  avg_stress?: number;
  avg_sleep?: number;
  entry_count?: number;
}

export interface CategoryStats {
  category: string;
  activity_count: number;
  total_points: number;
  total_hours: number;
}

export interface PointsDistribution {
  category: string;
  points: number;
  percentage: number;
}

export interface DailyActivity {
  date: string;
  has_activity: number;
}

export interface DayHourDistribution {
  day: string;
  day_number: number;
  hours: number;
}

export interface ActivityTotals {
  total_activities: number;
  total_points: number;
  total_hours: number;
  total_days: number;
  total_categories: number;
  points_per_hour: number;
}

export interface ActivityStats {
  time_periods: TimePeriodsStats[];
  categories: CategoryStats[];
  points_distribution: PointsDistribution[];
  current_streak: number;
  hour_distribution: DayHourDistribution[];
  totals: ActivityTotals;
  daily_activity: DailyActivity[];
}

export interface MoodDistribution {
  mood_score: number;
  count: number;
  percentage: number;
}

export interface SleepMoodCorrelation {
  sleep_hours: number;
  avg_mood: number;
}

export interface MoodTrend {
  date: string;
  avg_mood: number | null;
}

export interface MoodTotals {
  avg_mood: number;
  avg_energy: number;
  avg_stress: number;
  avg_sleep: number;
  total_entries: number;
  min_mood: number;
  max_mood: number;
}

export interface MoodStats {
  time_periods: TimePeriodsStats[];
  mood_distribution: MoodDistribution[];
  sleep_mood_correlation: SleepMoodCorrelation[];
  totals: MoodTotals;
  mood_trend: MoodTrend[];
}

export interface JournalEntriesByDate {
  date: string;
  entry_count: number;
}

export interface JournalStreak {
  start_date: string;
  end_date: string;
  days: number;
}

export interface TagFrequency {
  tag: string;
  count: number;
}

export interface JournalTotals {
  total_entries: number;
  unique_days: number;
  avg_length: number;
}

export interface JournalMoodCorrelation {
  date: string;
  avg_mood: number;
  journal_count: number;
}

export interface JournalStats {
  entries_by_date: JournalEntriesByDate[];
  streaks: JournalStreak[];
  tag_frequency: TagFrequency[];
  totals: JournalTotals;
  journal_mood_correlation: JournalMoodCorrelation[];
}

export interface ActivityTimelineItem {
  activity_id: number;
  date: string;
  start_time: string;
  end_time: string;
  category: string;
  activity: string;
  points: number;
  duration_hours: number;
}

export interface DashboardSummary {
  total_points: number;
  activity_summary: {
    total_activities: number;
    total_hours: number;
    current_streak: number;
    top_categories: CategoryStats[];
  };
  mood_summary: {
    avg_mood: number | null;
    mood_trend: MoodTrend[];
    total_entries: number;
  };
  journal_summary: {
    total_entries: number;
    unique_days: number;
    top_tags: TagFrequency[];
  };
  recent_activities?: any[]; // Activities from the get-event-data endpoint
}

/**
 * Get activity statistics for analytics
 */
export const getActivityStats = async (
  startDate?: string,
  endDate?: string,
  grouping: 'day' | 'week' | 'month' | 'year' = 'day'
): Promise<ActivityStats> => {
  const apiUrl = `${API_BASE_URL}/analytics/activity-stats`;
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  queryParams.append('grouping', grouping);
  
  const fullUrl = `${apiUrl}?${queryParams.toString()}`;
  logApiRequest(fullUrl, 'GET', { startDate, endDate, grouping });
  
  try {
    // Use direct fetch API with simplified options
    console.log(`[DEBUG] Making direct fetch request to ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    logApiResponse(fullUrl, response.status, 'Response received');
    const responseText = await response.text();
    console.log(`[DEBUG] Raw response (first 200 chars): ${responseText.substring(0, 200)}`);
    
    // Try to parse the response
    let data: ActivityStats;
    try {
      data = JSON.parse(responseText) as ActivityStats;
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError);
      throw new Error(`Failed to parse response: ${parseError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log(`[API] Activity stats data received:`, 
      data ? `Keys: ${Object.keys(data).join(', ')}` : 'No data');
    
    // Simple validation that the data structure is correct
    if (!data || typeof data !== 'object' || !data.totals) {
      console.error('[API] Invalid activity stats data structure:', data);
      throw new Error('Invalid data structure received from API');
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error fetching activity statistics from ${apiUrl}:`, error);
    
    // Return mock data for development with a consistent structure
    return {
      time_periods: [],
      categories: [],
      points_distribution: [],
      current_streak: 0,
      hour_distribution: [],
      totals: {
        total_activities: 0,
        total_points: 0,
        total_hours: 0,
        total_days: 0,
        total_categories: 0,
        points_per_hour: 0
      },
      daily_activity: []
    };
  }
};

/**
 * Get mood statistics for analytics
 */
export const getMoodStats = async (
  startDate?: string,
  endDate?: string,
  grouping: 'day' | 'week' | 'month' | 'year' = 'day'
): Promise<MoodStats> => {
  const apiUrl = `${API_BASE_URL}/analytics/mood-stats`;
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  queryParams.append('grouping', grouping);
  
  const fullUrl = `${apiUrl}?${queryParams.toString()}`;
  logApiRequest(fullUrl, 'GET', { startDate, endDate, grouping });
  
  try {
    // Use direct fetch API with simplified options
    console.log(`[DEBUG] Making direct fetch request to ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    logApiResponse(fullUrl, response.status, 'Response received');
    const responseText = await response.text();
    console.log(`[DEBUG] Raw response (first 200 chars): ${responseText.substring(0, 200)}`);
    
    // Try to parse it as JSON
    let data: MoodStats;
    try {
      data = JSON.parse(responseText) as MoodStats;
    } catch (parseError) {
      console.error('[API] Failed to parse mood stats JSON:', responseText.substring(0, 200));
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log(`[API] Mood stats data received:`, 
      data ? `Keys: ${Object.keys(data).join(', ')}` : 'No data');
    
    // Simple validation that the data structure is correct
    if (!data || typeof data !== 'object' || !data.totals) {
      console.error('[API] Invalid mood stats data structure:', data);
      throw new Error('Invalid data structure received from API');
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error fetching mood statistics from ${apiUrl}:`, error);
    
    // Return mock data for development with a consistent structure
    return {
      time_periods: [],
      mood_distribution: [],
      sleep_mood_correlation: [],
      totals: {
        avg_mood: 0,
        avg_energy: 0,
        avg_stress: 0,
        avg_sleep: 0,
        total_entries: 0,
        min_mood: 0,
        max_mood: 0
      },
      mood_trend: []
    };
  }
};

/**
 * Get journal statistics for analytics
 */
export const getJournalStats = async (
  startDate?: string,
  endDate?: string
): Promise<JournalStats> => {
  const apiUrl = `${API_BASE_URL}/analytics/journal-stats`;
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  
  const fullUrl = `${apiUrl}?${queryParams.toString()}`;
  logApiRequest(fullUrl, 'GET', { startDate, endDate });
  
  try {
    // Use direct fetch API with simplified options
    console.log(`[DEBUG] Making direct fetch request to ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    logApiResponse(fullUrl, response.status, 'Response received');
    const responseText = await response.text();
    console.log(`[DEBUG] Raw response (first 200 chars): ${responseText.substring(0, 200)}`);
    
    // Try to parse it as JSON
    let data: JournalStats;
    try {
      data = JSON.parse(responseText) as JournalStats;
    } catch (parseError) {
      console.error('[API] Failed to parse journal stats JSON:', responseText.substring(0, 200));
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log(`[API] Journal stats data received:`, 
      data ? `Keys: ${Object.keys(data).join(', ')}` : 'No data');
    
    // Simple validation that the data structure is correct
    if (!data || typeof data !== 'object' || !data.totals) {
      console.error('[API] Invalid journal stats data structure:', data);
      throw new Error('Invalid data structure received from API');
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error fetching journal statistics from ${apiUrl}:`, error);
    
    // Return mock data for development with a consistent structure
    return {
      entries_by_date: [],
      streaks: [],
      tag_frequency: [],
      totals: {
        total_entries: 0,
        unique_days: 0,
        avg_length: 0
      },
      journal_mood_correlation: []
    };
  }
};

/**
 * Get activity timeline for analytics
 */
export const getActivityTimeline = async (
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<ActivityTimelineItem[]> => {
  const apiUrl = `${API_BASE_URL}/analytics/timeline`;
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  queryParams.append('limit', limit.toString());
  
  const fullUrl = `${apiUrl}?${queryParams.toString()}`;
  logApiRequest(fullUrl, 'GET', { startDate, endDate, limit });
  
  try {
    // Use direct fetch API with simplified options
    console.log(`[DEBUG] Making direct fetch request to ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    logApiResponse(fullUrl, response.status, 'Response received');
    const responseText = await response.text();
    console.log(`[DEBUG] Raw response (first 200 chars): ${responseText.substring(0, 200)}`);
    
    // Try to parse it as JSON
    let data: ActivityTimelineItem[];
    try {
      data = JSON.parse(responseText) as ActivityTimelineItem[];
    } catch (parseError) {
      console.error('[API] Failed to parse timeline JSON:', responseText.substring(0, 200));
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log(`[API] Timeline data received:`, 
      data ? `Items: ${data.length}` : 'No data');
    
    // Check that it's an array
    if (!Array.isArray(data)) {
      console.error('[API] Invalid timeline data structure - expected array:', data);
      throw new Error('Invalid data structure received from API - expected array');
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error fetching activity timeline from ${apiUrl}:`, error);
    
    // Return empty array for development
    return [];
  }
};

/**
 * Get dashboard summary
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  // Use the analytics proxy endpoint for testing
  const useProxy = false; // Set to false to use the regular endpoint
  const apiUrl = useProxy ? 
    `${API_BASE_URL}/analytics-proxy` : 
    `${API_BASE_URL}/analytics/dashboard-summary`;
  
  logApiRequest(apiUrl, 'GET');
  console.log(`[DEBUG] Using ${useProxy ? 'proxy' : 'regular'} analytics endpoint: ${apiUrl}`);
  
  try {
    // Use basic fetch instead of fetchWithTimeout for this troubleshooting
    const response = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    logApiResponse(apiUrl, response.status, 'Response received');
    const responseText = await response.text();
    console.log(`[DEBUG] Raw response: ${responseText.substring(0, 200)}`);
    
    // Try to parse it as JSON
    let data: DashboardSummary;
    try {
      data = JSON.parse(responseText) as DashboardSummary;
    } catch (parseError) {
      console.error('[API] Failed to parse dashboard summary JSON:', responseText.substring(0, 200));
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    logApiResponse(apiUrl, response.status, data);
    
    // Simple validation that the data structure is correct
    if (!data || typeof data !== 'object' || !data.activity_summary) {
      console.error('[API] Invalid dashboard summary data structure:', data);
      throw new Error('Invalid data structure received from API');
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error fetching dashboard summary from ${apiUrl}:`, error);
    
    // Return mock data for development with a consistent structure
    return {
      total_points: 0,
      activity_summary: {
        total_activities: 0,
        total_hours: 0,
        current_streak: 0,
        top_categories: []
      },
      mood_summary: {
        avg_mood: null,
        mood_trend: [],
        total_entries: 0
      },
      journal_summary: {
        total_entries: 0,
        unique_days: 0,
        top_tags: []
      }
    };
  }
};