import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function WalletScreen() {
  const { child } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/children/${child.id}/wallet`);
      setWallet(res.data.wallet);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  }, [child]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const balance = wallet ? parseFloat(wallet.balance) : 0;
  const totalEarned = wallet ? parseFloat(wallet.total_earned) : 0;
  const totalSpent = wallet ? parseFloat(wallet.total_spent) : 0;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>My Balance</Text>
        <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Total Earned</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.secondary }]}>+${totalEarned.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Total Spent</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.error }]}>-${totalSpent.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Savings Goal (placeholder) */}
      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>🎯 Savings Goal</Text>
        <Text style={styles.goalName}>Keep earning to set a goal!</Text>
        <View style={styles.goalBar}>
          <View style={[styles.goalFill, { width: `${Math.min((balance / 50) * 100, 100)}%` }]} />
        </View>
        <Text style={styles.goalProgress}>${balance.toFixed(2)} / $50.00</Text>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {transactions.map((t) => (
        <View key={t.id} style={styles.transactionRow}>
          <Text style={styles.transactionIcon}>
            {t.type === 'earning' ? '💰' : t.type === 'spending' ? '🛒' : t.type === 'interest' ? '📈' : '📋'}
          </Text>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDesc}>{t.description || t.type}</Text>
            <Text style={styles.transactionTime}>{new Date(t.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.transactionAmount, t.type === 'earning' || t.type === 'interest' ? styles.amountPositive : styles.amountNegative]}>
            {t.type === 'earning' || t.type === 'interest' ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
          </Text>
        </View>
      ))}

      {transactions.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💰</Text>
          <Text style={styles.emptyText}>Complete chores to earn money!</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  balanceCard: { backgroundColor: COLORS.primary, margin: 20, borderRadius: 16, padding: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { fontSize: 48, fontWeight: '800', color: '#fff', marginTop: 4 },
  balanceRow: { flexDirection: 'row', marginTop: 20, width: '100%' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  balanceItemLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  balanceItemValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  goalCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  goalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  goalName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  goalBar: { height: 10, backgroundColor: COLORS.surfaceElevated, borderRadius: 5, marginTop: 12 },
  goalFill: { height: 10, backgroundColor: COLORS.secondary, borderRadius: 5 },
  goalProgress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'right' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 6, borderRadius: 10, padding: 14 },
  transactionIcon: { fontSize: 24, marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  transactionTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '700' },
  amountPositive: { color: COLORS.secondary },
  amountNegative: { color: COLORS.error },
  empty: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
