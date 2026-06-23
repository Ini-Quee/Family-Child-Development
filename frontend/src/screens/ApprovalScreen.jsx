import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ApprovalScreen() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get('/assignments?status=completed');
      setPending(res.data.assignments);
    } catch (err) {
      console.error('Fetch pending error:', err);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchPending();
    setRefreshing(false);
  }

  async function approve(id) {
    try {
      await api.post(`/assignments/${id}/approve`);
      fetchPending();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve');
    }
  }

  async function reject(id) {
    Alert.prompt?.('Reason', 'Why is this rejected?', async (reason) => {
      try {
        await api.post(`/assignments/${id}/reject`, { reason: reason || 'Please try again' });
        fetchPending();
      } catch (err) {
        Alert.alert('Error', 'Failed to reject');
      }
    });
    // Fallback for platforms without Alert.prompt
    try {
      await api.post(`/assignments/${id}/reject`, { reason: 'Please try again' });
      fetchPending();
    } catch (err) {
      console.error('Reject error:', err);
    }
  }

  async function approveAll() {
    try {
      // Group by child and approve all
      const childIds = [...new Set(pending.map(p => p.child_id))];
      for (const childId of childIds) {
        await api.post('/assignments/bulk-approve', { childId });
      }
      Alert.alert('✅ Done!', `Approved all pending chores`);
      fetchPending();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve all');
    }
  }

  return (
    <View style={styles.container}>
      {pending.length > 0 && (
        <TouchableOpacity style={styles.approveAllBtn} onPress={approveAll}>
          <Text style={styles.approveAllText}>✅ Approve All ({pending.length})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.childName}>{item.child_name}</Text>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.time}>
                {item.completed_at ? new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
              {item.notes && <Text style={styles.notes}>"{item.notes}"</Text>}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)}>
                <Text style={styles.approveBtnText}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id)}>
                <Text style={styles.rejectBtnText}>✗ Redo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No chores waiting for approval</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  approveAllBtn: { backgroundColor: COLORS.secondary, margin: 20, borderRadius: 12, padding: 14, alignItems: 'center' },
  approveAllText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardInfo: { flex: 1 },
  childName: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  taskTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  category: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  notes: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  actions: { gap: 8 },
  approveBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { backgroundColor: COLORS.surfaceElevated, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  rejectBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});
