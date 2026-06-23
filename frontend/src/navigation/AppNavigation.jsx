import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../lib/constants';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ParentDashboard from '../screens/ParentDashboard';
import ChildHome from '../screens/ChildHome';
import AddChoreScreen from '../screens/AddChoreScreen';
import ChildProgressScreen from '../screens/ChildProgressScreen';
import ApprovalScreen from '../screens/ApprovalScreen';
import WalletScreen from '../screens/WalletScreen';
import BadgesScreen from '../screens/BadgesScreen';
import ChildSelectScreen from '../screens/ChildSelectScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { paddingBottom: 4, height: 60 },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ParentDashboard}
        options={{
          title: '🏠 Home',
          headerTitle: 'FamilyOS',
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalScreen}
        options={{
          title: '✅ Approve',
          headerTitle: 'Approve Chores',
        }}
      />
      <Tab.Screen
        name="AddChore"
        component={AddChoreScreen}
        options={{
          title: '➕ Chore',
          headerTitle: 'Add Chore',
        }}
      />
      <Tab.Screen
        name="ChildProgress"
        component={ChildProgressScreen}
        options={{
          title: '📊 Stats',
          headerTitle: 'Child Progress',
        }}
      />
    </Tab.Navigator>
  );
}

function ChildTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { paddingBottom: 4, height: 60 },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={ChildHome}
        options={{
          title: '🏠 Home',
          headerTitle: 'My Tasks',
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: '💰 Wallet',
          headerTitle: 'My Wallet',
        }}
      />
      <Tab.Screen
        name="Badges"
        component={BadgesScreen}
        options={{
          title: '🏆 Badges',
          headerTitle: 'My Badges',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigation() {
  const { isParent, isChild, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Loading FamilyOS...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
          </>
        ) : isParent ? (
          <Stack.Screen name="ParentApp" component={ParentTabs} />
        ) : (
          <Stack.Screen name="ChildApp" component={ChildTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
