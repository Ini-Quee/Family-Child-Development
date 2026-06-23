import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { COLORS, CATEGORY_ICONS, DIFFICULTY_COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ChildHome() {
  const { child, logout } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assignRes, progressRes] = await Promise.all([
        api.get('/assignments/today'),
        api.get(`/children/${child.id}/progress`),
      ]);
      setAssignments(assignRes.data.assignments);
      setProgress(progressRes.data);
    } catch (err) {
      console.error('Child data fetch error:', err);
    }
  }, [child]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function markComplete(assignmentId) {
    try {
      await api.post(`/assignments/${assignmentId}/complete`, {});
      Alert.alert('🎉 Done!', 'Waiting for parent approval');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to mark complete');
    }
  }

  const completed = assignments.filter(a => a.status === 'approved' || a.status === 'completed').length;
  const total = assignments.length;
  const xpToNext = progress?.nextLevel ? progress.nextLevel.xp_required - child.xp : 0;
  const xpProgress = progress?.nextLevel
    ? (child.xp - progress.level.xp_required) / (progress.nextLevel.xp_required - progress.level.xp_required)
    : 1;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {child?.name}! 👋</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Level Card */}
      <View style={styles.levelCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelEmoji}>⭐</Text>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Level {progress?.child?.current_level || child?.level} — {progress?.level?.title || 'Newcomer'}</Text>
            <Text style={styles.xpText}>{child?.xp || 0} XP · {xpToNext > 0 ? `${xpToNext} to next level` : 'Max level!'}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakText}>🔥 {progress?.child?.current_streak_days || 0} day streak</Text>
          <Text style={styles.streakText}>💰 ${(progress?.child?.total_xp || 0) > 0 ? 'earned' : '$0'}</Text>
        </View>
      </View>

      {/* Today's Progress */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Today's Missions</Text>
        <Text style={styles.progressCount}>{completed}/{total} complete</Text>
        <View style={styles.progressBarLarge}>
          <View style={[styles.progressFillLarge, { width: `${total > 0 ? (completed / total) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Task List */}
      <Text style={styles.sectionTitle}>Tasks</Text>
      {assignments.map((a) => (
        <View key={a.id} style={[styles.taskCard, a.status === 'approved' && styles.taskCardDone]}>
          <View style={styles.taskLeft}>
            <Text style={styles.taskIcon}>{CATEGORY_ICONS[a.category] || '📋'}</Text>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, a.status === 'approved' && styles.taskTitleDone]}>{a.title}</Text>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskDifficulty, { color: DIFFICULTY_COLORS[a.difficulty] }]}>
                  {a.difficulty === 'easy' ? '⭐' : a.difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                </Text>
                <Text style={styles.taskReward}>+{a.xp_value} XP · ${parseFloat(a.money_value).toFixed(2)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.taskRight}>
            {a.status === 'pending' && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => markComplete(a.id)}>
                <Text style={styles.completeBtnText}>✓</Text>
              </TouchableOpacity>
            )}
            {a.status === 'completed' && (
              <View style={styles.awaitingBadge}>
                <Text style={styles.awaitingText}>⏳</Text>
              </View>
            )}
            {a.status === 'approved' && (
              <View style={styles.approvedBadge}>
                <Text style={styles.approvedText}>✅</Text>
              </View>
            )}
            {a.status === 'rejected' && (
              <View>
                <Text style={styles.rejectedText}>↩️</Text>
                <Text style={styles.rejectedHint}>Redo</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {assignments.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyText}>No tasks for today!</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  logoutText: { color: COLORS.error, fontWeight: '600', fontSize: 14 },
  levelCard: { backgroundColor: COLORS.primary, marginHorizontal: 20, borderRadius: 16, padding: 20 },
  levelRow: { flexDirection: 'row', alignItems: 'center' },
  levelEmoji: { fontSize: 36, marginRight: 12 },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  xpText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginTop: 12 },
  progressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  streakText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  progressCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  progressCount: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  progressBarLarge: { height: 12, backgroundColor: COLORS.surfaceElevated, borderRadius: 6, marginTop: 12 },
  progressFillLarge: { height: 12, backgroundColor: COLORS.secondary, borderRadius: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  taskCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  taskCardDone: { opacity: 0.7, backgroundColor: '#F0FDF4' },
  taskLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  taskIcon: { fontSize: 24, marginRight: 12 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  taskDifficulty: { fontSize: 12 },
  taskReward: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  taskRight: { marginLeft: 12 },
  completeBtn: { backgroundColor: COLORS.secondary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  completeBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  awaitingBadge: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  awaitingText: { fontSize: 24 },
  approvedBadge: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  approvedText: { fontSize: 24 },
  rejectedText: { fontSize: 24, textAlign: 'center' },
  rejectedHint: { fontSize: 10, color: COLORS.error, textAlign: 'center' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
