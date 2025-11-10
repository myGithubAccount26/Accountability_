import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchDashboardSummary } from '@/services/dashboard';
import { DashboardCard } from '@/components/DashboardCard';
import { PointsSummary } from '@/components/PointsSummary';
import { ActivityCard } from '@/components/ActivityCard';

interface DashboardSummary {
  total_points: number;
  activity_summary: {
    total_activities: number;
    total_hours: number;
    current_streak: number;
    top_categories: { category: string; activity_count: number }[];
  };
  mood_summary: {
    avg_mood: number | null;
    total_entries: number;
    mood_trend: { date: string; avg_mood: number | null }[];
  };
  journal_summary: {
    total_entries: number;
    unique_days: number;
    top_tags: { tag: string; count: number }[];
  };
  recent_activities: ActivityCard['activity'][];
}

const initialSummary: DashboardSummary = {
  total_points: 0,
  activity_summary: {
    total_activities: 0,
    total_hours: 0,
    current_streak: 0,
    top_categories: [],
  },
  mood_summary: {
    avg_mood: null,
    total_entries: 0,
    mood_trend: [],
  },
  journal_summary: {
    total_entries: 0,
    unique_days: 0,
    top_tags: [],
  },
  recent_activities: [],
};

export default function HomeScreen() {
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tintColor = useThemeColor({}, 'tint');

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load dashboard summary', err);
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  useEffect(() => {
    if (!summary.recent_activities.length && !isLoading) {
      loadSummary();
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }, [loadSummary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <ThemedText type="title">Dashboard</ThemedText>
          <ThemedText style={styles.subtitle}>
            Track streaks, points, and recent wins
          </ThemedText>
        </View>
        <ThemedView style={[styles.streakBadge, { borderColor: tintColor }]}
        >
          <ThemedText style={styles.streakValue}>{summary.activity_summary.current_streak}</ThemedText>
          <ThemedText style={styles.streakLabel}>Day streak</ThemedText>
        </ThemedView>
      </View>

      <PointsSummary
        totalPoints={summary.total_points}
        dailyPoints={Math.round(summary.activity_summary.total_hours)}
        weeklyPoints={summary.activity_summary.total_activities}
        monthlyPoints={summary.journal_summary.total_entries}
        streakDays={summary.activity_summary.current_streak}
      />

      <DashboardCard
        title="Top Categories"
        value={`${summary.activity_summary.total_activities} activities`}
        subtitle={`${summary.activity_summary.total_hours.toFixed(1)} hrs logged`}
        icon="bar-chart"
      >
        <View style={styles.tagRow}>
          {summary.activity_summary.top_categories.map((cat) => (
            <ThemedView key={cat.category} style={styles.tagChip}>
              <ThemedText style={styles.tagText}>
                {cat.category} • {cat.activity_count}
              </ThemedText>
            </ThemedView>
          ))}
          {summary.activity_summary.top_categories.length === 0 && (
            <ThemedText style={styles.fallbackText}>Log activities to see top categories</ThemedText>
          )}
        </View>
      </DashboardCard>

      <DashboardCard
        title="Mood check"
        value={summary.mood_summary.avg_mood ?? '—'}
        subtitle={`From ${summary.mood_summary.total_entries} entries`}
        icon="happy"
      >
        <ThemedText style={styles.fallbackText}>
          {summary.mood_summary.total_entries
            ? 'Keep journaling to unlock trends.'
            : 'Start logging moods to see insights.'}
        </ThemedText>
      </DashboardCard>

      <DashboardCard
        title="Journal activity"
        value={`${summary.journal_summary.total_entries} entries`}
        subtitle={`${summary.journal_summary.unique_days} unique days`}
        icon="document-text"
      >
        <View style={styles.tagRow}>
          {summary.journal_summary.top_tags.map((tag) => (
            <ThemedView key={tag.tag} style={styles.tagChip}>
              <ThemedText style={styles.tagText}>
                #{tag.tag} • {tag.count}
              </ThemedText>
            </ThemedView>
          ))}
          {summary.journal_summary.top_tags.length === 0 && (
            <ThemedText style={styles.fallbackText}>Add tags to journals to see trends.</ThemedText>
          )}
        </View>
      </DashboardCard>

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Recent activity
      </ThemedText>
      <View>
        {summary.recent_activities.slice(0, 3).map((activity) => (
          <ActivityCard key={activity.activity_id} activity={activity as any} />
        ))}
        {summary.recent_activities.length === 0 && (
          <ThemedText style={styles.fallbackText}>No recent activity logged.</ThemedText>
        )}
      </View>

      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.7,
  },
  streakBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 10,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tagText: {
    fontSize: 12,
  },
  fallbackText: {
    opacity: 0.6,
  },
  errorText: {
    color: 'red',
    marginTop: 16,
  },
});
