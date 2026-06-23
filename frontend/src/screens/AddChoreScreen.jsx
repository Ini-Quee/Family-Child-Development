import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { COLORS } from '../lib/constants';
import api from '../lib/api';

export default function AddChoreScreen({ navigation }) {
  const [children, setChildren] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [difficulty, setDifficulty] = useState('medium');
  const [xpValue, setXpValue] = useState('10');
  const [moneyValue, setMoneyValue] = useState('1.00');
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [recurrence, setRecurrence] = useState('daily');
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const res = await api.get('/children');
      setChildren(res.data.children);
    } catch (err) {
      console.error('Load children error:', err);
    }
  }

  function toggleChild(id) {
    setSelectedChildren(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Error', 'Chore title is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/chores', {
        title: title.trim(),
        description: description.trim() || null,
        category,
        difficulty,
        xpValue: parseInt(xpValue) || 10,
        moneyValue: parseFloat(moneyValue) || 0,
        requiresPhoto,
        requiresApproval,
        recurrence,
        assignTo: selectedChildren,
      });
      Alert.alert('✅ Created!', 'Chore added successfully', [
        { text: 'OK', onPress: () => {
          setTitle(''); setDescription(''); setXpValue('10'); setMoneyValue('1.00');
          setSelectedChildren([]);
        }}
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create chore');
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { key: 'cleaning', label: '🧹 Cleaning' },
    { key: 'kitchen', label: '🍽️ Kitchen' },
    { key: 'laundry', label: '👕 Laundry' },
    { key: 'outdoor', label: '🌿 Outdoor' },
    { key: 'pet_care', label: '🐕 Pet Care' },
    { key: 'personal_hygiene', label: '🪥 Hygiene' },
    { key: 'homework', label: '📚 Homework' },
    { key: 'exercise', label: '🏃 Exercise' },
    { key: 'other', label: '📋 Other' },
  ];

  const difficulties = [
    { key: 'easy', label: '⭐ Easy', xp: '5-10' },
    { key: 'medium', label: '⭐⭐ Medium', xp: '10-20' },
    { key: 'hard', label: '⭐⭐⭐ Hard', xp: '20-30' },
  ];

  const recurrences = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekdays', label: 'Weekdays' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'once', label: 'Once' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.label}>Chore Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Clean bathroom" placeholderTextColor={COLORS.textMuted} />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="What needs to be done?" placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.optionGrid}>
        {categories.map(c => (
          <TouchableOpacity key={c.key} style={[styles.optionChip, category === c.key && styles.optionChipActive]} onPress={() => setCategory(c.key)}>
            <Text style={[styles.optionChipText, category === c.key && styles.optionChipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty */}
      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.optionRow}>
        {difficulties.map(d => (
          <TouchableOpacity key={d.key} style={[styles.optionBtn, difficulty === d.key && styles.optionBtnActive]} onPress={() => { setDifficulty(d.key); setXpValue(d.xp.split('-')[0]); }}>
            <Text style={[styles.optionBtnText, difficulty === d.key && styles.optionBtnTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rewards */}
      <View style={styles.rewardRow}>
        <View style={styles.rewardField}>
          <Text style={styles.label}>XP Value</Text>
          <TextInput style={styles.input} value={xpValue} onChangeText={setXpValue} keyboardType="numeric" />
        </View>
        <View style={styles.rewardField}>
          <Text style={styles.label}>Money ($)</Text>
          <TextInput style={styles.input} value={moneyValue} onChangeText={setMoneyValue} keyboardType="decimal-pad" />
        </View>
      </View>

      {/* Recurrence */}
      <Text style={styles.label}>Frequency</Text>
      <View style={styles.optionRow}>
        {recurrences.map(r => (
          <TouchableOpacity key={r.key} style={[styles.optionChip, recurrence === r.key && styles.optionChipActive]} onPress={() => setRecurrence(r.key)}>
            <Text style={[styles.optionChipText, recurrence === r.key && styles.optionChipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assign To */}
      <Text style={styles.label}>Assign To</Text>
      <View style={styles.optionRow}>
        {children.map(c => (
          <TouchableOpacity key={c.id} style={[styles.childChip, selectedChildren.includes(c.id) && styles.childChipActive]} onPress={() => toggleChild(c.id)}>
            <Text style={[styles.childChipText, selectedChildren.includes(c.id) && styles.childChipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Options */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Require photo proof</Text>
        <Switch value={requiresPhoto} onValueChange={setRequiresPhoto} trackColor={{ true: COLORS.primary }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Require parent approval</Text>
        <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ true: COLORS.primary }} />
      </View>

      {/* Create Button */}
      <TouchableOpacity style={[styles.createBtn, loading && styles.createBtnDisabled]} onPress={handleCreate} disabled={loading}>
        <Text style={styles.createBtnText}>{loading ? 'Creating...' : '✅ Create Chore'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { fontSize: 13, color: COLORS.textSecondary },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  optionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionBtnText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  optionBtnTextActive: { color: '#fff', fontWeight: '600' },
  rewardRow: { flexDirection: 'row', gap: 12 },
  rewardField: { flex: 1 },
  childChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  childChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  childChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  childChipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  switchLabel: { fontSize: 15, color: COLORS.textPrimary },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
