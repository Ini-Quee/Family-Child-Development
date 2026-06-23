import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ChildProgressScreen() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const res = await api.get('/children');
      setChildren(res.data.children);
      if (res.data.children.length > 0) {
        setSelectedChild(res.data.children[0]);
      }
    } catch (err) {
      console.error('Load children error:', err);
    }
  }

  useEffect(() => {
    if (selectedChild) fetchProgress(selectedChild.id);
  }, [selectedChild]);

  async function fetchProgress(childId) {
    try {
      const res = await api.get(`/children/${childId}/progress`);
      setProgress(res.data);
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    if (selectedChild) await fetchProgress(selectedChild.id);
    setRefreshing(false);
  }

  if (children.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>👶</Text>
        <Text style={styles.emptyText}>Add children first</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Child Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector} contentContainerStyle={styles.selectorContent}>
        {children.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.childChip, selectedChild?.id === c.id && styles.childChipActive]}
            onPress={() => setSelectedChild(c)}
          >
            <Text style={[styles.childChipText, selectedChild?.id === c.id && styles.childChipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {progress && (
        <>
          {/* Level Card */}
          <View style={styles.levelCard}>
            <Text style={styles.levelEmoji}>⭐</Text>
            <Text style={styles.levelTitle}>Level {progress.child.current_level}</Text>
            <Text style={styles.levelSubtitle}>{progress.level?.title || 'Newcomer'}</Text>
            <Text style={styles.xpText}>{progress.child.total_xp} XP total</Text>
            {progress.nextLevel && (
              <Text style={styles.nextLevelText}>
                {progress.nextLevel.xp_required - progress.child.total_xp} XP to Level {progress.nextLevel.level}
              </Text>
            )}
          </View>

          {/* Today Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{progress.today.total}</Text>
              <Text style={styles.statLabel}>Today's Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.secondary }]}>{progress.today.approved}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{progress.today.pending + progress.today.completed}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>

          {/* Streaks */}
          <Text style={styles.sectionTitle}>Streaks</Text>
          <View style={styles.streakGrid}>
            {progress.streaks.map((s) => (
              <View key={s.streak_type} style={styles.streakCard}>
                <Text style={styles.streakIcon}>
                  {s.streak_type === 'chore' ? '🏠' : s.streak_type === 'homework' ? '📚' : '💪'}
                </Text>
                <Text style={styles.streakValue}>{s.current_count}</Text>
                <Text style={styles.streakLabel}>{s.streak_type}</Text>
                <Text style={styles.streakBest}>Best: {s.longest_count}</Text>
              </View>
            ))}
          </View>

          {/* Achievements */}
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          {progress.achievements.length > 0 ? (
            progress.achievements.map((a) => (
              <View key={a.badge_id} style={styles.achievementRow}>
                <Text style={styles.achievementIcon}>🏅</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{a.badge_name}</Text>
                  <Text style={styles.achievementDate}>{new Date(a.earned_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noAchievements}>No achievements yet — keep going!</Text>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  selector: { maxHeight: 60 },
  selectorContent: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', alignItems: 'center' },
  childChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  childChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  childChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  childChipTextActive: { color: '#fff' },
  levelCard: { backgroundColor: COLORS.primary, margin: 20, borderRadius: 16, padding: 24, alignItems: 'center' },
  levelEmoji: { fontSize: 48 },
  levelTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 8 },
  levelSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  xpText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  nextLevelText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  streakGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  streakCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center' },
  streakIcon: { fontSize: 24 },
  streakValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  streakLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  streakBest: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 6, borderRadius: 10, padding: 14 },
  achievementIcon: { fontSize: 24, marginRight: 12 },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  achievementDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  noAchievements: { textAlign: 'center', color: COLORS.textMuted, padding: 20 },
});
