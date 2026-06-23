import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { COLORS, CATEGORY_ICONS, DIFFICULTY_COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ParentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }

  async function approveChore(assignmentId) {
    try {
      await api.post(`/assignments/${assignmentId}/approve`);
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve');
    }
  }

  async function rejectChore(assignmentId) {
    try {
      await api.post(`/assignments/${assignmentId}/reject`, { reason: 'Please try again' });
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to reject');
    }
  }

  if (!data) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading family...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Family Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
          <Text style={styles.statValue}>{data.familyStats.completionRate}%</Text>
          <Text style={styles.statLabel}>Done Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.statValue}>{data.familyStats.total_awaiting_approval}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
          <Text style={styles.statValue}>{data.familyStats.total_completed}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      {/* Children Cards */}
      <Text style={styles.sectionTitle}>Children</Text>
      {data.children.map((child) => (
        <View key={child.id} style={styles.childCard}>
          <View style={styles.childHeader}>
            <Text style={styles.childAvatar}>{child.age <= 10 ? '👧' : child.age <= 14 ? '🧒' : '👤'}</Text>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childLevel}>Level {child.current_level} · {child.total_xp} XP · 🔥 {child.current_streak_days} day streak</Text>
            </View>
          </View>
          <View style={styles.childStats}>
            <View style={styles.childStat}>
              <Text style={styles.childStatValue}>{child.today.total}</Text>
              <Text style={styles.childStatLabel}>Tasks</Text>
            </View>
            <View style={styles.childStat}>
              <Text style={[styles.childStatValue, { color: COLORS.secondary }]}>{child.today.approved}</Text>
              <Text style={styles.childStatLabel}>Done</Text>
            </View>
            <View style={styles.childStat}>
              <Text style={[styles.childStatValue, { color: COLORS.warning }]}>{child.today.pending + child.today.completed}</Text>
              <Text style={styles.childStatLabel}>Remaining</Text>
            </View>
            <View style={styles.childStat}>
              <Text style={[styles.childStatValue, { color: COLORS.primary }]}>${parseFloat(child.wallet?.balance || 0).toFixed(2)}</Text>
              <Text style={styles.childStatLabel}>Earned</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Pending Approvals */}
      {data.pendingApprovals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>✅ Pending Approval</Text>
          {data.pendingApprovals.map((a) => (
            <View key={a.id} style={styles.approvalCard}>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalChild}>{a.child_name}</Text>
                <Text style={styles.approvalTask}>{a.title}</Text>
                <Text style={styles.approvalTime}>{a.completed_at ? new Date(a.completed_at).toLocaleTimeString() : ''}</Text>
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approveChore(a.id)}>
                  <Text style={styles.approveBtnText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectChore(a.id)}>
                  <Text style={styles.rejectBtnText}>✗</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  date: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  logoutBtn: { padding: 8 },
  logoutText: { color: COLORS.error, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  childCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  childAvatar: { fontSize: 36, marginRight: 12 },
  childInfo: { flex: 1 },
  childName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  childLevel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  childStats: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  childStat: { alignItems: 'center' },
  childStatValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  childStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  approvalCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  approvalInfo: { flex: 1 },
  approvalChild: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  approvalTask: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  approvalTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  approvalActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { backgroundColor: COLORS.secondary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  rejectBtn: { backgroundColor: COLORS.errorLight, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
