import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { COLORS, BADGE_ICONS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function BadgesScreen() {
  const { child } = useAuth();
  const [progress, setProgress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/children/${child.id}/progress`);
      setProgress(res.data);
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
  }, [child]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const allBadges = [
    { id: 'first_100_xp', name: 'First 100 XP', desc: 'Earn 100 XP total', category: 'growth', icon: '⭐' },
    { id: 'xp_1000', name: '1000 XP Club', desc: 'Earn 1000 XP total', category: 'growth', icon: '🌟' },
    { id: 'xp_5000', name: '5000 XP Legend', desc: 'Earn 5000 XP total', category: 'growth', icon: '💫' },
    { id: 'level_5', name: 'Level 5', desc: 'Reach Level 5', category: 'growth', icon: '🎯' },
    { id: 'level_10', name: 'Level 10', desc: 'Reach Level 10', category: 'growth', icon: '🏆' },
    { id: 'streak_3', name: '3-Day Streak', desc: '3 days in a row', category: 'streak', icon: '🔥' },
    { id: 'streak_7', name: '7-Day Streak', desc: '7 days in a row', category: 'streak', icon: '🔥🔥' },
    { id: 'streak_14', name: '14-Day Streak', desc: '14 days in a row', category: 'streak', icon: '🔥🔥🔥' },
    { id: 'streak_30', name: '30-Day Streak', desc: '30 days in a row', category: 'streak', icon: '👑' },
  ];

  const earnedIds = new Set(progress?.achievements?.map(a => a.badge_id) || []);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Level Overview */}
      <View style={styles.levelCard}>
        <Text style={styles.levelEmoji}>⭐</Text>
        <Text style={styles.levelTitle}>Level {progress?.child?.current_level || 1}</Text>
        <Text style={styles.levelSubtitle}>{progress?.level?.title || 'Newcomer'}</Text>
        <Text style={styles.xpText}>{progress?.child?.total_xp || 0} Total XP</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {progress?.child?.current_streak_days || 0}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🏅 {progress?.achievements?.length || 0}</Text>
          <Text style={styles.statLabel}>Badges Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {progress?.child?.longest_streak_days || 0}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>

      {/* Badges */}
      <Text style={styles.sectionTitle}>All Badges</Text>
      {allBadges.map((badge) => {
        const earned = earnedIds.has(badge.id);
        return (
          <View key={badge.id} style={[styles.badgeCard, earned && styles.badgeCardEarned]}>
            <Text style={styles.badgeIcon}>{earned ? badge.icon : '🔒'}</Text>
            <View style={styles.badgeInfo}>
              <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{badge.name}</Text>
              <Text style={styles.badgeDesc}>{badge.desc}</Text>
            </View>
            {earned && <Text style={styles.badgeCheck}>✅</Text>}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  levelCard: { backgroundColor: COLORS.primary, margin: 20, borderRadius: 16, padding: 24, alignItems: 'center' },
  levelEmoji: { fontSize: 48 },
  levelTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 8 },
  levelSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  xpText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  badgeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 14, opacity: 0.5 },
  badgeCardEarned: { opacity: 1, backgroundColor: '#F0FDF4' },
  badgeIcon: { fontSize: 28, marginRight: 14 },
  badgeInfo: { flex: 1 },
  badgeName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  badgeNameLocked: { color: COLORS.textMuted },
  badgeDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badgeCheck: { fontSize: 20 },
});
