import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginScreen } from './screens/LoginScreen.tsx';
import { EmployeeScreen } from './screens/EmployeeScreen.tsx';
import { BossDashboardScreen } from './screens/BossDashboardScreen.tsx';
import { initializeDefaultSeedData } from './services/storage.ts';

const AppNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (role === 'BOSS') {
    return <BossDashboardScreen />;
  }

  return <EmployeeScreen />;
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initializeDefaultSeedData();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
