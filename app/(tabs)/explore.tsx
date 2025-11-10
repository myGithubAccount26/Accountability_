import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View as RNView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
  Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Collapsible } from '@/components/Collapsible';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Import Victory components for charts
// To avoid Image resolution issues with Victory Native, we'll import directly from 'victory'
// Our metro.config.js already includes an alias: 'victory-native': 'victory'
import {
  VictoryPie,
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryLine,
  VictoryLabel,
  VictoryScatter,
  VictoryArea,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryTheme
} from 'victory';

// Create a custom material theme with light/dark mode support
const createMaterialTheme = (isDarkMode: boolean) => {
  // Theme colors based on mode
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#455A64",
    axisStroke: isDarkMode ? "#607D8B" : "#90A4AE",
    gridStroke: isDarkMode ? "#37474F" : "#ECEFF1",
    primary: isDarkMode ? "#64B5F6" : "#4285F4",
    accent: isDarkMode ? "#FF9800" : "#c43a31",
    background: isDarkMode ? "#263238" : "transparent",
  };

  return {
    area: {
      style: {
        data: {
          fill: colors.accent
        },
        labels: {
          fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, sans-serif",
          fontSize: 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    axis: {
      style: {
        axis: {
          fill: colors.background,
          stroke: colors.axisStroke,
          strokeWidth: Platform.OS === 'web' ? 1 : 2,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        },
        axisLabel: {
          textAnchor: "middle",
          fontFamily: Platform.OS === 'web' ? 
            "'Roboto', 'Helvetica Neue', Helvetica, sans-serif" : 
            "'System'",
          fontSize: Platform.OS === 'web' ? 14 : 12,
          padding: 8,
          fill: colors.text
        },
        grid: {
          fill: "none",
          stroke: colors.gridStroke,
          strokeDasharray: Platform.OS === 'web' ? "5, 3" : "10, 5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          pointerEvents: "painted"
        },
        ticks: {
          fill: "transparent",
          size: 5,
          stroke: colors.axisStroke,
          strokeWidth: 1,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        },
        tickLabels: {
          fontFamily: Platform.OS === 'web' ? 
            "'Roboto', 'Helvetica Neue', Helvetica, sans-serif" : 
            "'System'",
          fontSize: Platform.OS === 'web' ? 14 : 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    bar: {
      style: {
        data: {
          fill: colors.primary,
          padding: 8,
          strokeWidth: 0
        },
        labels: {
          fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, sans-serif",
          fontSize: 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    chart: {
      width: 450,
      height: 300,
      padding: 50
    }
  };
};

// Import API services
import {
  getDashboardSummary,
  getActivityStats,
  getMoodStats,
  getJournalStats,
  getActivityTimeline,
  DashboardSummary,
  ActivityStats,
  MoodStats,
  JournalStats,
  TagFrequency,
  ActivityTimelineItem,
  API_BASE_URL
} from '@/services/points-api';

// Helper function to debug API endpoints
const getAPIEndpointURL = (endpoint: string) => {
  return `${API_BASE_URL}/analytics/${endpoint}`;
};

// Get screen dimensions - with responsive sizing for different platforms
const screenWidth = Dimensions.get('window').width;
const chartWidth = Platform.OS === 'web' ? Math.min(800, screenWidth - 40) : screenWidth - 40;
const chartHeight = Platform.OS === 'web' ? 400 : 300;

export default function AnalyticsDashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [journalStats, setJournalStats] = useState<JournalStats | null>(null);
  const [activityTimeline, setActivityTimeline] = useState<ActivityTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'activities' | 'mood' | 'journal'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [exporting, setExporting] = useState(false);
  const colorScheme = useColorScheme();
  
  // Determine if we're in dark mode and create the appropriate theme
  const isDarkMode = colorScheme === 'dark';
  const chartTheme = React.useMemo(() => createMaterialTheme(isDarkMode), [isDarkMode]);

  // Load dashboard data
  const loadData = useCallback(async () => {
    console.log('Loading dashboard data...');
    setLoading(true);
    setRefreshing(true);
    
    try {
      // Calculate date ranges first, so we have it ready for parallel requests
      const now = new Date();
      let startDate;
      let endDate = new Date(now); // Set end date to current date/time
      
      if (timeRange === 'week') {
        // Past 7 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        // Past 30 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      } else if (timeRange === 'year') {
        // Past 365 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 365);
      }
      
      const startDateStr = startDate?.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log(`Fetching data from ${startDateStr} to ${endDateStr}`);
      
      // Use Promise.allSettled to run API calls in parallel and handle timeouts gracefully
      const [summaryResult, activitiesResult, moodsResult, journalsResult, timelineResult] = 
        await Promise.allSettled([
          // Get summary data
          getDashboardSummary(),
          
          // Fetch activity stats
          getActivityStats(startDateStr, endDateStr, timeRange === 'year' ? 'month' : 'day'),
          
          // Fetch mood stats
          getMoodStats(startDateStr, endDateStr, timeRange === 'year' ? 'month' : 'day'),
          
          // Fetch journal stats
          getJournalStats(startDateStr, endDateStr),
          
          // Fetch activity timeline
          getActivityTimeline(startDateStr, endDateStr, 100)
        ]);
      
      // Process results with error handling for each request
      if (summaryResult.status === 'fulfilled') {
        console.log('Dashboard Summary Data:', JSON.stringify(summaryResult.value).substring(0, 200) + '...');
        setSummary(summaryResult.value);
      } else {
        console.error('Error loading dashboard summary:', summaryResult.reason);
        // Keep previous data if available
      }
      
      if (activitiesResult.status === 'fulfilled') {
        console.log('Activity Stats Data:', 
          activitiesResult.value ? `Received ${JSON.stringify(activitiesResult.value).length} bytes of data` : 'No data received');
        console.log('Activity Stats Structure:', 
          activitiesResult.value ? Object.keys(activitiesResult.value).join(', ') : 'No structure available');
        setActivityStats(activitiesResult.value);
      } else {
        console.error('Error loading activity stats:', activitiesResult.reason);
        // Keep previous data if available
      }
      
      if (moodsResult.status === 'fulfilled') {
        console.log('Mood Stats Data:', 
          moodsResult.value ? `Received ${JSON.stringify(moodsResult.value).length} bytes of data` : 'No data received');
        console.log('Mood Stats Structure:', 
          moodsResult.value ? Object.keys(moodsResult.value).join(', ') : 'No structure available');
        setMoodStats(moodsResult.value);
      } else {
        console.error('Error loading mood stats:', moodsResult.reason);
        // Keep previous data if available
      }
      
      if (journalsResult.status === 'fulfilled') {
        console.log('Journal Stats Data:', 
          journalsResult.value ? `Received ${JSON.stringify(journalsResult.value).length} bytes of data` : 'No data received');
        console.log('Journal Stats Structure:', 
          journalsResult.value ? Object.keys(journalsResult.value).join(', ') : 'No structure available');
        setJournalStats(journalsResult.value);
      } else {
        console.error('Error loading journal stats:', journalsResult.reason);
        // Keep previous data if available
      }
      
      if (timelineResult.status === 'fulfilled') {
        console.log('Timeline Data:', 
          timelineResult.value ? `Received ${timelineResult.value.length} activities` : 'No activities received');
        setActivityTimeline(timelineResult.value);
      } else {
        console.error('Error loading activity timeline:', timelineResult.reason);
        // Keep previous data if available
      }
      
      // Check if we got any successful data
      const allFailed = [summaryResult, activitiesResult, moodsResult, journalsResult, timelineResult]
        .every(result => result.status === 'rejected');
      
      if (allFailed) {
        console.error('All dashboard data requests failed');
        Alert.alert(
          'Loading Error',
          'Failed to load dashboard data. This could be due to server timeout or connectivity issues. Please try again later.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('Dashboard data loaded successfully (at least partially)');
      }
    } catch (error) {
      console.error('Error in dashboard data loading process:', error);
      Alert.alert(
        'Loading Error',
        'There was an issue loading dashboard data. You may see partial information.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  const handleRefresh = () => {
    loadData();
  };
  
  // Generate CSV data for export
  const generateCsv = (data: any, type: 'activities' | 'mood' | 'journal'): string => {
    let csv = '';
    
    if (type === 'activities' && activityTimeline.length > 0) {
      // Headers
      csv += 'Date,Category,Activity,Duration (hours),Points\n';
      
      // Data rows
      activityTimeline.forEach(item => {
        csv += `${item.date},${item.category},"${item.activity}",${item.duration_hours},${item.points}\n`;
      });
    } else if (type === 'mood' && moodStats) {
      // Headers
      csv += 'Period,Average Mood,Average Energy,Average Stress,Average Sleep\n';
      
      // Data rows
      moodStats.time_periods.forEach(item => {
        csv += `${item.period},${item.avg_mood || 0},${item.avg_energy || 0},${item.avg_stress || 0},${item.avg_sleep || 0}\n`;
      });
    } else if (type === 'journal' && journalStats) {
      // Headers
      csv += 'Date,Entry Count\n';
      
      // Data rows
      journalStats.entries_by_date.forEach(item => {
        csv += `${item.date},${item.entry_count}\n`;
      });
      
      // Add tag frequency
      csv += '\nTag,Frequency\n';
      journalStats.tag_frequency.forEach(tag => {
        csv += `${tag.tag},${tag.count}\n`;
      });
    }
    
    return csv;
  };
  
  // Handle export of analytics data
  const handleExport = async (type: 'activities' | 'mood' | 'journal') => {
    try {
      setExporting(true);
      
      // Generate CSV data
      const csvData = generateCsv(type === 'activities' ? activityTimeline : 
                                type === 'mood' ? moodStats : journalStats, type);
      
      // Ensure there's data to export
      if (!csvData) {
        Alert.alert('Export Error', 'No data available to export');
        setExporting(false);
        return;
      }
      
      // Set filename based on type and current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `accountability_${type}_${date}.csv`;
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          // Save to temporary file
          const filePath = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(filePath, csvData, { encoding: FileSystem.EncodingType.UTF8 });
          
          // Share the file
          if (Platform.OS === 'ios') {
            await Sharing.shareAsync(filePath);
          } else {
            // For Android
            const shareResult = await Share.share({
              title: `Accountability ${type.charAt(0).toUpperCase() + type.slice(1)} Data`,
              message: `Accountability ${type} data export from ${date}`,
              url: `file://${filePath}`
            });
            
            if (shareResult.action === Share.sharedAction) {
              console.log('Shared successfully');
            }
          }
        } catch (err) {
          console.error('Native sharing error:', err);
          Alert.alert('Export Error', 'Could not share file. Please try again.');
        }
      } else {
        try {
          // For web, create a blob and download it
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link); // This is needed for Firefox
          link.click();
          document.body.removeChild(link); // Clean up
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Web download error:', err);
          Alert.alert('Export Error', 'Could not download file. Please try again.');
        }
      }
      
      console.log(`Exported ${type} data successfully`);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Error', 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // Render a skeleton placeholder for loading state
  const renderSkeletonItem = (height: number = 80, width: number = '100%', marginBottom: number = 10) => (
    <RNView 
      style={{
        height, 
        width, 
        backgroundColor: isDarkMode ? 'rgba(100,100,100,0.15)' : 'rgba(200,200,200,0.15)', 
        borderRadius: 8,
        marginBottom,
        overflow: 'hidden'
      }}
    >
      <RNView 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.3,
          backgroundColor: isDarkMode ? '#444' : '#eee',
          transform: [{ translateX: -350 }]
        }}
      />
    </RNView>
  );
  
  // Render the overview tab
  const renderOverview = () => {
    if (!summary) {
      // Skeleton loading state
      return (
        <RNView style={{ padding: 15 }}>
          {/* Points Summary Skeleton */}
          <ThemedText style={[styles.sectionTitle, { opacity: 0.5 }]}>Points Summary</ThemedText>
          {renderSkeletonItem(100)}
          
          {/* Activity Summary Skeleton */}
          <ThemedText style={[styles.sectionTitle, { opacity: 0.5, marginTop: 20 }]}>Activity Summary</ThemedText>
          <RNView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {renderSkeletonItem(50, '30%', 15)}
            {renderSkeletonItem(50, '30%', 15)}
            {renderSkeletonItem(50, '30%', 15)}
          </RNView>
          {renderSkeletonItem(40)}
          {renderSkeletonItem(40)}
          
          {/* Mood Summary Skeleton */}
          <ThemedText style={[styles.sectionTitle, { opacity: 0.5, marginTop: 20 }]}>Mood Summary</ThemedText>
          {renderSkeletonItem(80)}
          
          {/* Journal Summary Skeleton */}
          <ThemedText style={[styles.sectionTitle, { opacity: 0.5, marginTop: 20 }]}>Journal Summary</ThemedText>
          <RNView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {renderSkeletonItem(50, '45%', 15)}
            {renderSkeletonItem(50, '45%', 15)}
          </RNView>
          {renderSkeletonItem(60)}
        </RNView>
      );
    }

    return (
      <>
        {/* Points Summary */}
        <Collapsible title="Points Summary" initiallyExpanded>
          <RNView style={styles.overviewPointsCard}>
            <ThemedText style={styles.pointsTotal}>{summary.total_points}</ThemedText>
            <ThemedText style={styles.pointsLabel}>Total Points</ThemedText>
          </RNView>
        </Collapsible>

        {/* Activity Summary */}
        <Collapsible title="Activity Summary" initiallyExpanded>
          <RNView style={styles.statsRow}>
            <RNView style={styles.statItem}>
              <ThemedText style={styles.statValue}>{summary?.activity_summary?.total_activities || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Activities</ThemedText>
            </RNView>
            <RNView style={styles.statItem}>
              <ThemedText style={styles.statValue}>{summary?.activity_summary?.total_hours?.toFixed(1) || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Hours</ThemedText>
            </RNView>
            <RNView style={styles.statItem}>
              <ThemedText style={styles.statValue}>{summary?.activity_summary?.current_streak || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
            </RNView>
          </RNView>

          {summary?.activity_summary?.top_categories?.length > 0 && (
            <>
              <ThemedText style={styles.sectionTitle}>Top Categories</ThemedText>
              {summary.activity_summary.top_categories.map((category, index) => (
                <RNView key={index} style={styles.categoryRow}>
                  <ThemedText style={styles.categoryName}>{category?.category || 'Uncategorized'}</ThemedText>
                  <ThemedText style={styles.categoryCount}>{category?.activity_count || 0}</ThemedText>
                </RNView>
              ))}
            </>
          )}
          
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => setSelectedTab('activities')}
          >
            <ThemedText style={styles.viewMoreText}>View Activity Details</ThemedText>
          </TouchableOpacity>
        </Collapsible>

        {/* Mood Summary */}
        <Collapsible title="Mood Summary" initiallyExpanded>
          {summary?.mood_summary?.avg_mood ? (
            <RNView style={styles.moodSummary}>
              <ThemedText style={styles.moodValue}>
                {summary?.mood_summary?.avg_mood?.toFixed(1) || 0}
              </ThemedText>
              <ThemedText style={styles.moodLabel}>
                Average Mood
              </ThemedText>
              <ThemedText style={styles.entriesCount}>
                From {summary?.mood_summary?.total_entries || 0} entries
              </ThemedText>
              
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => setSelectedTab('mood')}
              >
                <ThemedText style={styles.viewMoreText}>View Mood Details</ThemedText>
              </TouchableOpacity>
            </RNView>
          ) : (
            <ThemedText style={styles.noDataText}>
              No mood data available. Start tracking your mood in the Journal section.
            </ThemedText>
          )}
        </Collapsible>

        {/* Journal Summary */}
        <Collapsible title="Journal Summary" initiallyExpanded>
          <RNView style={styles.statsRow}>
            <RNView style={styles.statItem}>
              <ThemedText style={styles.statValue}>{summary?.journal_summary?.total_entries || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Entries</ThemedText>
            </RNView>
            <RNView style={styles.statItem}>
              <ThemedText style={styles.statValue}>{summary?.journal_summary?.unique_days || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Days</ThemedText>
            </RNView>
          </RNView>
          
          {summary?.journal_summary?.top_tags?.length > 0 && (
            <RNView style={styles.tagsContainer}>
              <ThemedText style={styles.sectionTitle}>Top Tags</ThemedText>
              <RNView style={styles.tagCloud}>
                {summary.journal_summary.top_tags.map((tag, index) => (
                  <RNView key={index} style={styles.tag}>
                    <ThemedText style={styles.tagText}>{tag?.tag || ''}</ThemedText>
                  </RNView>
                ))}
              </RNView>
            </RNView>
          )}
          
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => setSelectedTab('journal')}
          >
            <ThemedText style={styles.viewMoreText}>View Journal Analytics</ThemedText>
          </TouchableOpacity>
        </Collapsible>
      </>
    );
  };

  // Render the activities tab
  const renderActivities = () => {
    if (!activityStats) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <ThemedText style={styles.loadingText}>Loading activity data...</ThemedText>
          
          {/* Add a retry button in case of API errors */}
          <TouchableOpacity 
            style={[styles.viewMoreButton, { marginTop: 20 }]}
            onPress={() => loadData()}
          >
            <ThemedText style={styles.viewMoreText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }
    
    // Check if we have valid activity data
    if (!activityStats || !activityStats.totals || 
        !activityStats.points_distribution || !Array.isArray(activityStats.points_distribution) || 
        !activityStats.hour_distribution || !Array.isArray(activityStats.hour_distribution) || 
        !activityStats.time_periods || !Array.isArray(activityStats.time_periods)) {
      
      console.log('Activity data is invalid or empty:', 
        activityStats ? `Structure: ${Object.keys(activityStats).join(', ')}` : 'No data');
      
      // Check if we have recent activities from the dashboard summary to use as fallback
      if (summary?.recent_activities && summary.recent_activities.length > 0) {
        console.log('Using recent_activities from dashboard summary as fallback data');
        // We have recent_activities from dashboard summary, use those instead of showing error
        // This won't have all the stats data, but at least we can show the timeline
      } else {
        return (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons 
              name="fitness-outline" 
              size={60} 
              color={Colors[colorScheme].icon} 
              style={{ marginBottom: 20, opacity: 0.5 }}
            />
            <ThemedText style={styles.emptyText}>
              No activity data available in this time range. Try tracking some activities.
            </ThemedText>
            <TouchableOpacity 
              style={[styles.viewMoreButton, { marginTop: 20 }]}
              onPress={() => loadData()}
            >
              <ThemedText style={styles.viewMoreText}>Retry Loading Data</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewMoreButton, { marginTop: 10 }]}
              onPress={() => setSelectedTab('overview')}
            >
              <ThemedText style={styles.viewMoreText}>Return to Overview</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        );
      }
    }

    // Prepare data for category distribution pie chart - with safety checks
    const categoryData = Array.isArray(activityStats?.points_distribution)
      ? activityStats.points_distribution
          .filter(item => item && item.category && item.points !== undefined && item.percentage !== undefined)
          .map(item => ({
            x: item.category || 'Other',
            y: typeof item.points === 'number' ? item.points : 0,
            label: `${item.category || 'Other'}: ${typeof item.percentage === 'number' ? item.percentage : 0}%`
          }))
      : [];

    // Prepare data for hours by day of week chart - with safety checks
    const hoursByDayData = Array.isArray(activityStats?.hour_distribution)
      ? activityStats.hour_distribution
          .filter(item => item && item.day && item.hours !== undefined)
          .map(item => ({
            x: item.day && typeof item.day === 'string' ? item.day.substring(0, 3) : '???', // Use first 3 letters of day name
            y: typeof item.hours === 'number' ? item.hours : 0
          }))
      : [];

    // Prepare data for activity trend chart - with safety checks
    const activityTrendData = Array.isArray(activityStats?.time_periods)
      ? activityStats.time_periods
          .filter(item => item && item.period && item.activity_count !== undefined)
          .map(item => ({
            x: item.period || 'Unknown',
            y: typeof item.activity_count === 'number' ? item.activity_count : 0
          }))
      : [];

    return (
      <>
        <Collapsible title="Activity Overview" initiallyExpanded>
          <RNView style={styles.statsGrid}>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{activityStats?.totals?.total_activities || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Activities</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{activityStats?.totals?.total_points || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Points</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{activityStats?.totals?.total_hours?.toFixed(1) || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Hours</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{activityStats?.totals?.total_days || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Days</ThemedText>
            </RNView>
          </RNView>
        </Collapsible>

        {/* Category Distribution Pie Chart */}
        {categoryData.length > 0 && (
          <Collapsible title="Points by Category" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryPie
                data={categoryData}
                width={chartWidth}
                height={chartHeight}
                colorScale={["#0984e3", "#6c5ce7", "#00b894", "#00cec9", "#fdcb6e", "#e17055", "#d63031", "#e84393"]}
                style={{ 
                  labels: { fill: Colors[colorScheme].text, fontSize: 10 },
                  data: {
                    fillOpacity: ({ datum }) => datum && datum.y ? (datum.y > 100 ? 1 : 0.7) : 0.5,
                    stroke: "#fff",
                    strokeWidth: 2
                  }
                }}
                labelRadius={({ innerRadius }) => (innerRadius || 0) + 30}
                innerRadius={70}
                padAngle={3}
                animate={{
                  duration: 1000,
                  onLoad: { duration: 500 }
                }}
                events={[{
                  target: "data",
                  eventHandlers: {
                    onPressIn: () => {
                      return [
                        {
                          target: "data",
                          mutation: (props) => {
                            return {
                              style: Object.assign({}, props.style, { 
                                opacity: 1,
                                stroke: "#fff",
                                strokeWidth: 3
                              })
                            };
                          }
                        }
                      ];
                    },
                    onPressOut: () => {
                      return [
                        {
                          target: "data",
                          mutation: () => null
                        }
                      ];
                    }
                  }
                }]}
              />
            </RNView>
          </Collapsible>
        )}

        {/* Hours by Day of Week Bar Chart */}
        {hoursByDayData.length > 0 && (
          <Collapsible title="Hours by Day of Week" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                domainPadding={{ x: 30 }}
                theme={chartTheme}
                containerComponent={
                  <VictoryVoronoiContainer
                    voronoiDimension="x"
                    labels={({ datum }) => datum && datum.y ? `${datum.x}: ${typeof datum.y === 'number' ? datum.y.toFixed(1) : datum.y} hours` : ""}
                    labelComponent={<VictoryTooltip 
                      cornerRadius={5} 
                      flyoutStyle={{ 
                        fill: isDarkMode ? "#37474F" : "white", 
                        stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                      }} 
                    />}
                  />
                }
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryBar
                  data={hoursByDayData}
                  style={{
                    data: { 
                      fill: Colors[colorScheme].tint,
                      width: 25
                    }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                  cornerRadius={4}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Activity Trend Line Chart */}
        {activityTrendData.length > 0 && (
          <Collapsible title="Activity Trend" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={chartTheme}
                domainPadding={{ x: 20 }}
                containerComponent={
                  <VictoryVoronoiContainer
                    voronoiDimension="x"
                    labels={({ datum }) => datum ? `${datum.x}: ${datum.y} activities` : ""}
                    labelComponent={<VictoryTooltip 
                      cornerRadius={5} 
                      flyoutStyle={{ 
                        fill: isDarkMode ? "#37474F" : "white", 
                        stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                      }}
                    />}
                  />
                }
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                  }}
                  tickCount={5}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryArea
                  data={activityTrendData}
                  style={{
                    data: { 
                      stroke: Colors[colorScheme].tint, 
                      strokeWidth: 2,
                      fill: Colors[colorScheme].tint,
                      fillOpacity: 0.2
                    }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
                <VictoryScatter
                  data={activityTrendData}
                  size={5}
                  style={{
                    data: { fill: Colors[colorScheme].tint }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Activity Timeline */}
        {(() => {
          // Determine which activity data to use - prefer activityTimeline, fall back to summary.recent_activities
          const timelineData = activityTimeline.length > 0 
            ? activityTimeline 
            : (summary?.recent_activities || []);
          
          return timelineData.length > 0 && (
            <Collapsible title="Recent Activity Timeline" initiallyExpanded={false}>
              {timelineData
                .slice(0, 10)
                .filter(item => !!item) // Filter out null/undefined items
                .map((item, index) => {
                  // Handle potential different property naming between endpoints
                  const date = item.date || item.Date || new Date();
                  const activity = item.activity || item.Activity || "Unknown Activity";
                  const category = item.category || item.Category || "Uncategorized";
                  
                  // Calculate duration - either directly from property or compute from start/end times
                  let duration = item.duration_hours;
                  if (!duration && item.start_time && item.end_time) {
                    // Try to calculate from start and end times if available
                    try {
                      const start = new Date(`2000-01-01T${item.start_time}`);
                      const end = new Date(`2000-01-01T${item.end_time}`);
                      duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    } catch (e) {
                      console.warn('Error calculating duration:', e);
                      duration = 0;
                    }
                  } else if (!duration && item.Start_Time && item.End_Time) {
                    // Try to calculate from capitalized properties
                    try {
                      const start = new Date(`2000-01-01T${item.Start_Time}`);
                      const end = new Date(`2000-01-01T${item.End_Time}`);
                      duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    } catch (e) {
                      console.warn('Error calculating duration:', e);
                      duration = 0;
                    }
                  }
                  
                  // Get points value
                  const points = item.points || item.Points || 0;
                  
                  return (
                    <RNView key={index} style={styles.timelineItem}>
                      <RNView style={styles.timelineDate}>
                        <ThemedText style={styles.timelineDateText}>
                          {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </ThemedText>
                      </RNView>
                      <RNView style={styles.timelineContent}>
                        <ThemedText style={styles.timelineTitle}>{activity}</ThemedText>
                        <ThemedText style={styles.timelineCategory}>{category}</ThemedText>
                        <RNView style={styles.timelineDetails}>
                          <ThemedText style={styles.timelineDuration}>
                            {typeof duration === 'number' ? duration.toFixed(1) : "0.0"} hrs
                          </ThemedText>
                          <ThemedText style={styles.timelinePoints}>+{points} pts</ThemedText>
                        </RNView>
                      </RNView>
                    </RNView>
                  );
                })}
              {timelineData.length > 10 && (
                <ThemedText style={styles.moreTimelineText}>
                  {`${timelineData.length - 10} more activities not shown...`}
                </ThemedText>
              )}
            </Collapsible>
          );
        })()}

        {/* Current Streak */}
        <Collapsible title="Activity Streak" initiallyExpanded>
          <ThemedText style={styles.streakValue}>
            {activityStats?.current_streak || 0}
          </ThemedText>
          <ThemedText style={styles.streakLabel}>
            {(activityStats?.current_streak || 0) === 1 ? 'Day' : 'Days'} in a row with activities
          </ThemedText>
        </Collapsible>
      </>
    );
  };

  // Render the mood tab
  const renderMood = () => {
    // Show loading or error state
    if (!moodStats) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <ThemedText style={styles.loadingText}>Loading mood data...</ThemedText>
          
          {/* Add a retry button in case of API errors */}
          <TouchableOpacity 
            style={[styles.viewMoreButton, { marginTop: 20 }]}
            onPress={() => loadData()}
          >
            <ThemedText style={styles.viewMoreText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    // If there's no mood data, or if the mood data is incomplete/invalid
    if (!moodStats?.totals || !moodStats?.mood_trend || !moodStats?.mood_distribution || 
        moodStats.totals.total_entries === 0) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <Ionicons 
            name="analytics-outline" 
            size={60} 
            color={Colors[colorScheme].icon} 
            style={{ marginBottom: 20, opacity: 0.5 }}
          />
          <ThemedText style={styles.emptyText}>
            No mood data available. Start tracking your mood in the Journal section.
          </ThemedText>
          <TouchableOpacity 
            style={[styles.viewMoreButton, { marginTop: 20 }]}
            onPress={() => setSelectedTab('overview')}
          >
            <ThemedText style={styles.viewMoreText}>Return to Overview</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    // Prepare data for mood trend chart - with safety checks
    const moodTrendData = Array.isArray(moodStats?.mood_trend) 
      ? moodStats.mood_trend
          .filter(item => item && item.avg_mood !== null)
          .map(item => ({
            x: item.date || 'Unknown',
            y: typeof item.avg_mood === 'number' ? item.avg_mood : 0
          }))
      : [];

    // Prepare data for mood distribution chart - with safety checks
    const moodDistributionData = Array.isArray(moodStats?.mood_distribution) 
      ? moodStats.mood_distribution
          .filter(item => item && item.mood_score !== undefined && item.count !== undefined)
          .map(item => ({
            x: item.mood_score?.toString() || '0',
            y: typeof item.count === 'number' ? item.count : 0
          }))
      : [];

    // Prepare data for sleep-mood correlation chart - with safety checks
    const sleepMoodData = Array.isArray(moodStats?.sleep_mood_correlation) 
      ? moodStats.sleep_mood_correlation
          .filter(item => item && item.sleep_hours !== undefined && item.avg_mood !== null)
          .map(item => ({
            x: typeof item.sleep_hours === 'number' ? item.sleep_hours : 0,
            y: typeof item.avg_mood === 'number' ? item.avg_mood : 0
          }))
      : [];

    return (
      <>
        <Collapsible title="Mood Overview" initiallyExpanded>
          <RNView style={styles.statsGrid}>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{moodStats?.totals?.avg_mood?.toFixed(1) || 'N/A'}</ThemedText>
              <ThemedText style={styles.statLabel}>Avg Mood</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{moodStats?.totals?.avg_energy?.toFixed(1) || 'N/A'}</ThemedText>
              <ThemedText style={styles.statLabel}>Avg Energy</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{moodStats?.totals?.avg_stress?.toFixed(1) || 'N/A'}</ThemedText>
              <ThemedText style={styles.statLabel}>Avg Stress</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{moodStats?.totals?.total_entries || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Entries</ThemedText>
            </RNView>
          </RNView>
        </Collapsible>

        {/* Mood Trend Line Chart */}
        {moodTrendData.length > 0 && (
          <Collapsible title="Mood Trend" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={chartTheme}
                domainPadding={{ x: 20 }}
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                  }}
                  tickCount={5}
                />
                <VictoryAxis
                  dependentAxis
                  domain={[0, 10]}
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryLine
                  data={moodTrendData}
                  style={{
                    data: { stroke: "#0984e3", strokeWidth: 2 }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
                <VictoryScatter
                  data={moodTrendData}
                  size={5}
                  style={{
                    data: { fill: "#0984e3" }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Mood Distribution Bar Chart */}
        {moodDistributionData.length > 0 && (
          <Collapsible title="Mood Distribution" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                domainPadding={{ x: 25 }}
                theme={chartTheme}
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryBar
                  data={moodDistributionData}
                  style={{
                    data: { fill: "#6c5ce7" }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Sleep-Mood Correlation Scatter Plot */}
        {sleepMoodData.length > 0 && (
          <Collapsible title="Sleep & Mood Correlation" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={chartTheme}
              >
                <VictoryAxis
                  label="Sleep Hours"
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { fill: Colors[colorScheme].text },
                    axisLabel: { padding: 30, fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  label="Mood Score"
                  domain={[0, 10]}
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text },
                    axisLabel: { padding: 40, fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryScatter
                  data={sleepMoodData}
                  size={7}
                  style={{
                    data: { fill: "#00b894" }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}
      </>
    );
  };

  // Render the journal tab
  const renderJournal = () => {
    if (!journalStats) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <ThemedText style={styles.loadingText}>Loading journal data...</ThemedText>
          
          {/* Add a retry button in case of API errors */}
          <TouchableOpacity 
            style={[styles.viewMoreButton, { marginTop: 20 }]}
            onPress={() => loadData()}
          >
            <ThemedText style={styles.viewMoreText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    // If there's no journal data, or the data is incomplete/invalid
    if (!journalStats?.totals || !journalStats?.entries_by_date || !journalStats?.tag_frequency ||
        journalStats.totals.total_entries === 0) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <Ionicons 
            name="book-outline" 
            size={60} 
            color={Colors[colorScheme].icon} 
            style={{ marginBottom: 20, opacity: 0.5 }}
          />
          <ThemedText style={styles.emptyText}>
            No journal entries available. Start writing in the Journal section.
          </ThemedText>
          <TouchableOpacity 
            style={[styles.viewMoreButton, { marginTop: 20 }]}
            onPress={() => setSelectedTab('overview')}
          >
            <ThemedText style={styles.viewMoreText}>Return to Overview</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    // Prepare data for entries by date chart - with safety checks
    const entriesByDateData = Array.isArray(journalStats?.entries_by_date)
      ? journalStats.entries_by_date
          .filter(item => item && item.date && item.entry_count !== undefined)
          .map(item => ({
            x: item.date || 'Unknown',
            y: typeof item.entry_count === 'number' ? item.entry_count : 0
          }))
      : [];

    // Prepare tag frequency data - with safety checks
    const tagFrequencyData = Array.isArray(journalStats?.tag_frequency)
      ? journalStats.tag_frequency
          .filter(tag => tag && tag.tag && tag.count !== undefined)
          .slice(0, 10) // Get top 10 tags
          .map(tag => ({
            x: tag.tag || 'Unknown',
            y: typeof tag.count === 'number' ? tag.count : 0
          }))
      : [];

    // Prepare journal-mood correlation data - with safety checks
    const journalMoodData = Array.isArray(journalStats?.journal_mood_correlation)
      ? journalStats.journal_mood_correlation
          .filter(item => item && item.date && item.avg_mood !== null && item.journal_count !== undefined)
          .map(item => ({
            x: item.date || 'Unknown',
            y: typeof item.avg_mood === 'number' ? item.avg_mood : 0,
            size: (typeof item.journal_count === 'number' ? item.journal_count : 1) * 3 // Scale the size based on journal count
          }))
      : [];

    return (
      <>
        <Collapsible title="Journal Overview" initiallyExpanded>
          <RNView style={styles.statsGrid}>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{journalStats?.totals?.total_entries || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Entries</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{journalStats?.totals?.unique_days || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Days</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>
                {journalStats?.streaks?.length > 0 
                  ? Math.max(...journalStats.streaks.map(s => s.days))
                  : 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Best Streak</ThemedText>
            </RNView>
            <RNView style={styles.statGridItem}>
              <ThemedText style={styles.statValue}>{journalStats?.totals?.avg_length?.toFixed(0) || 'N/A'}</ThemedText>
              <ThemedText style={styles.statLabel}>Avg Length</ThemedText>
            </RNView>
          </RNView>
        </Collapsible>

        {/* Journal Entries by Date Chart */}
        {entriesByDateData.length > 0 && (
          <Collapsible title="Journal Entries Over Time" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={chartTheme}
                domainPadding={{ x: 20 }}
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                  }}
                  tickCount={5}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryBar
                  data={entriesByDateData}
                  style={{
                    data: { fill: "#e84393" }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Tag Frequency Chart */}
        {tagFrequencyData.length > 0 && (
          <Collapsible title="Top Tags" initiallyExpanded>
            <RNView style={styles.chartContainer}>
              <VictoryChart
                width={chartWidth}
                height={Platform.OS === 'web' ? Math.max(350, tagFrequencyData.length * 40) : tagFrequencyData.length * 35 + 100}
                domainPadding={{ x: 20 }}
                theme={chartTheme}
              >
                <VictoryAxis
                  style={{
                    grid: { stroke: "none" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: "#e0e0e0" },
                    tickLabels: { fill: Colors[colorScheme].text }
                  }}
                />
                <VictoryBar
                  horizontal
                  data={tagFrequencyData}
                  style={{
                    data: { fill: "#00cec9" }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </RNView>
          </Collapsible>
        )}

        {/* Tag Cloud */}
        {journalStats.tag_frequency.length > 0 && (
          <Collapsible title="Tag Cloud" initiallyExpanded>
            <RNView style={styles.tagCloud}>
              {journalStats.tag_frequency.slice(0, 20).map((tag, index) => (
                <RNView 
                  key={index} 
                  style={[
                    styles.tag, 
                    { 
                      backgroundColor: getTagColor(index),
                      padding: getTagSize(tag.count, journalStats.tag_frequency)
                    }
                  ]}
                >
                  <ThemedText style={styles.tagText}>{tag.tag}</ThemedText>
                </RNView>
              ))}
            </RNView>
          </Collapsible>
        )}

        {/* Journal Streaks */}
        {journalStats.streaks.length > 0 && (
          <Collapsible title="Journal Streaks" initiallyExpanded>
            {journalStats.streaks
              .sort((a, b) => b.days - a.days)
              .slice(0, 5)
              .map((streak, index) => (
                <RNView key={index} style={styles.streakItem}>
                  <ThemedText style={styles.streakDays}>{streak.days} days</ThemedText>
                  <ThemedText style={styles.streakDates}>
                    {streak.start_date} - {streak.end_date}
                  </ThemedText>
                </RNView>
              ))}
          </Collapsible>
        )}
      </>
    );
  };

  // Helper function to get tag color based on index
  const getTagColor = (index: number) => {
    const colors = [
      "#0984e3", "#6c5ce7", "#00b894", "#00cec9", 
      "#fdcb6e", "#e17055", "#d63031", "#e84393",
      "#74b9ff", "#a29bfe", "#55efc4", "#81ecec",
      "#ffeaa7", "#fab1a0", "#ff7675", "#fd79a8"
    ];
    return colors[index % colors.length];
  };

  // Helper function to get tag size based on count
  const getTagSize = (count: number, tags: TagFrequency[]) => {
    // Find the maximum count
    const maxCount = Math.max(...tags.map(t => t.count));
    
    // Scale the size between 4 and 12 based on the count
    const minSize = 4;
    const maxSize = 12;
    const size = minSize + (count / maxCount) * (maxSize - minSize);
    
    return size;
  };

  return (
    <ThemedView style={styles.container}>
      <RNView style={styles.header}>
        <Ionicons name="analytics" size={30} color={Colors[colorScheme].tint} style={styles.headerIcon} />
        <ThemedText style={styles.title}>Analytics Dashboard</ThemedText>
      </RNView>
      
      {/* Tab navigation */}
      <RNView style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]} 
          onPress={() => setSelectedTab('overview')}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>Overview</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'activities' && styles.activeTab]} 
          onPress={() => setSelectedTab('activities')}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'activities' && styles.activeTabText]}>Activities</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'mood' && styles.activeTab]} 
          onPress={() => setSelectedTab('mood')}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'mood' && styles.activeTabText]}>Mood</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'journal' && styles.activeTab]} 
          onPress={() => setSelectedTab('journal')}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'journal' && styles.activeTabText]}>Journal</ThemedText>
        </TouchableOpacity>
      </RNView>
      
      {/* Controls Row */}
      <RNView style={styles.controlsRow}>
        {/* Time range selector */}
        <RNView style={styles.timeRangeSelector}>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]} 
            onPress={() => setTimeRange('week')}
          >
            <ThemedText style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>Week</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]} 
            onPress={() => setTimeRange('month')}
          >
            <ThemedText style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>Month</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'year' && styles.activeTimeRange]} 
            onPress={() => setTimeRange('year')}
          >
            <ThemedText style={[styles.timeRangeText, timeRange === 'year' && styles.activeTimeRangeText]}>Year</ThemedText>
          </TouchableOpacity>
        </RNView>
        
        {/* Export Button */}
        {selectedTab !== 'overview' && (
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => handleExport(selectedTab)}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <RNView style={styles.exportButtonContent}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <ThemedText style={styles.exportButtonText}>Export</ThemedText>
              </RNView>
            )}
          </TouchableOpacity>
        )}
      </RNView>
      
      {loading && !refreshing ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <ThemedText style={styles.loadingText}>Loading analytics...</ThemedText>
        </ThemedView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors[colorScheme].tint]}
              tintColor={Colors[colorScheme].tint}
            />
          }
        >
          {selectedTab === 'overview' && renderOverview()}
          {selectedTab === 'activities' && renderActivities()}
          {selectedTab === 'mood' && renderMood()}
          {selectedTab === 'journal' && renderJournal()}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)', // More universal border color
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.tint, // The tint color is the same in both themes
  },
  tabText: {
    fontSize: 14,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: Colors.light.tint, // The tint color is the same in both themes
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'center',
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeTimeRange: {
    backgroundColor: Colors.light.tint,
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
  },
  activeTimeRangeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  overviewPointsCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(200, 230, 255, 0.1)', // Lighter for light mode, subtle for dark mode
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(200, 230, 255, 0.2)', // Subtle border
  },
  pointsTotal: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginVertical: 10,
  },
  pointsLabel: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
    paddingLeft: 5,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryName: {
    fontSize: 14,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewMoreButton: {
    marginTop: 15,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
  moodSummary: {
    alignItems: 'center',
    marginVertical: 10,
  },
  moodValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6c5ce7',
  },
  moodLabel: {
    fontSize: 16,
    marginTop: 5,
  },
  entriesCount: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 5,
    marginBottom: 5,
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    opacity: 0.7,
  },
  tagsContainer: {
    marginTop: 10,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  tag: {
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 4,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  statGridItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(240, 240, 240, 0.1)', // Compatible with both modes
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.2)', // Subtle border
  },
  chartContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginTop: 10,
  },
  streakLabel: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 10,
  },
  streakItem: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  streakDays: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakDates: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  // Timeline styles
  timelineItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timelineDate: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 6,
  },
  timelineDateText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timelineCategory: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  timelineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineDuration: {
    fontSize: 12,
    color: '#666',
  },
  timelinePoints: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  moreTimelineText: {
    textAlign: 'center',
    padding: 12,
    fontSize: 12,
    opacity: 0.7,
  }
});