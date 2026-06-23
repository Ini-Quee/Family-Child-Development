import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { COLORS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function ChildSelectScreen({ navigation }) {
  const { childLogin } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('DEMO2024');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const res = await api.get(`/auth/family-children?inviteCode=${inviteCode}`);
      setChildren(res.data.children);
    } catch (err) {
      Alert.alert('Error', 'Could not find family. Check invite code.');
    }
  }

  function handlePinInput(digit) {
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      handleChildLogin(newPin);
    }
  }

  function handlePinDelete() {
    setPin(pin.slice(0, -1));
  }

  async function handleChildLogin(pinValue) {
    if (!selectedChild) return;
    setLoading(true);
    try {
      await childLogin(selectedChild.id, pinValue);
    } catch (err) {
      Alert.alert('Wrong PIN', 'Please try again');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  if (!showPin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Tap your name to login</Text>

        <View style={styles.childGrid}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={styles.childCard}
              onPress={() => { setSelectedChild(child); setShowPin(true); }}
            >
              <Text style={styles.childAvatar}>{child.age <= 10 ? '👧' : child.age <= 14 ? '🧒' : '👤'}</Text>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childAge}>Age {child.age}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Parent Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => { setShowPin(false); setPin(''); setSelectedChild(null); }} style={styles.backButton}>
        <Text style={styles.backText}>← Choose different person</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Hi, {selectedChild?.name}!</Text>
      <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

      <View style={styles.pinDisplay}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.keyButton, key === '' && styles.keyButtonEmpty]}
            onPress={() => {
              if (key === '⌫') handlePinDelete();
              else if (key !== '') handlePinInput(key);
            }}
            disabled={key === '' || loading}
          >
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <Text style={styles.loadingText}>Logging in...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  childGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  childCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center', width: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  childAvatar: { fontSize: 48 },
  childName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  childAge: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  backButton: { marginTop: 24, alignItems: 'center' },
  backText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  pinDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  pinDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.primary },
  pinDotFilled: { backgroundColor: COLORS.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  keyButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  keyButtonEmpty: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  keyText: { fontSize: 24, fontWeight: '600', color: COLORS.textPrimary },
  loadingText: { textAlign: 'center', marginTop: 16, color: COLORS.primary, fontSize: 16 },
});
