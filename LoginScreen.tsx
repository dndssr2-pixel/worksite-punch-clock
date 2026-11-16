import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginScreen: React.FC = () => {
  const { loginAsBoss, loginAsEmployee, registerEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'BOSS'>('EMPLOYEE');
  
  // Employee Login / Sign-up state
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [employeePin, setEmployeePin] = useState<string>('');

  // Sign up fields
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regDept, setRegDept] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regConfirmPin, setRegConfirmPin] = useState<string>('');

  // Boss login fields
  const [bossEmail, setBossEmail] = useState<string>('boss@company.com');
  const [bossPassword, setBossPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleEmployeeLogin = async () => {
    if (!employeePin.trim()) {
      Alert.alert('PIN Required', 'Please enter your 4-digit employee PIN.');
      return;
    }

    setLoading(true);
    try {
      const ok = await loginAsEmployee(employeePin.trim());
      if (!ok) {
        Alert.alert('Login Failed', 'Invalid PIN. If you are a new employee, please tap "Sign Up" below to create your account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!regPin.trim() || regPin.trim().length < 4) {
      Alert.alert('Invalid PIN', 'Please choose a 4-digit numeric PIN.');
      return;
    }
    if (regPin.trim() !== regConfirmPin.trim()) {
      Alert.alert('PIN Mismatch', 'Your PIN and confirm PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerEmployee({
        name: regName.trim(),
        email: regEmail.trim(),
        department: regDept.trim() || 'General Staff',
        pin: regPin.trim(),
        companyCode: 'CORP100'
      });

      if (!res.success) {
        Alert.alert('Registration Failed', res.message || 'Could not register employee.');
      } else {
        Alert.alert('Welcome!', `Account created for ${res.user?.name}. You can now punch in/out.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBossLogin = async () => {
    if (!bossPassword.trim()) {
      Alert.alert('Password Required', 'Please enter the Master Boss PIN/Password.');
      return;
    }

    setLoading(true);
    try {
      const ok = await loginAsBoss(bossPassword.trim());
      if (!ok) {
        Alert.alert('Access Denied', 'Invalid master administrator password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⏱️</Text>
          </View>
          <Text style={styles.brandTitle}>Worksite Punch Clock</Text>
          <Text style={styles.companyName}>Apex Construction & Field Services</Text>
          <View style={styles.companyBadge}>
            <Text style={styles.companyBadgeText}>COMPANY CODE: CORP100</Text>
          </View>
        </View>

        {/* Top Role Selector Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'EMPLOYEE' && styles.tabActive]}
            onPress={() => setActiveTab('EMPLOYEE')}
          >
            <Text style={[styles.tabText, activeTab === 'EMPLOYEE' && styles.tabTextActive]}>
              👷 Employee Portal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'BOSS' && styles.tabActive]}
            onPress={() => setActiveTab('BOSS')}
          >
            <Text style={[styles.tabText, activeTab === 'BOSS' && styles.tabTextActive]}>
              👔 Master Boss Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Employee View (Login or Register) */}
        {activeTab === 'EMPLOYEE' ? (
          <View style={styles.formCard}>
            {/* Login vs Register Sub-toggle */}
            <View style={styles.subToggle}>
              <TouchableOpacity
                style={[styles.subToggleBtn, !isRegistering && styles.subToggleBtnActive]}
                onPress={() => setIsRegistering(false)}
              >
                <Text style={[styles.subToggleText, !isRegistering && styles.subToggleTextActive]}>
                  Sign In (PIN)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subToggleBtn, isRegistering && styles.subToggleBtnActive]}
                onPress={() => setIsRegistering(true)}
              >
                <Text style={[styles.subToggleText, isRegistering && styles.subToggleTextActive]}>
                  Sign Up (New Staff)
                </Text>
              </TouchableOpacity>
            </View>

            {!isRegistering ? (
              /* Sign In with PIN */
              <>
                <Text style={styles.formTitle}>Employee Clock In</Text>
                <Text style={styles.formSubtitle}>
                  Enter your registered 4-digit PIN to punch in or out.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>4-Digit PIN</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your PIN"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    value={employeePin}
                    onChangeText={setEmployeePin}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleEmployeeLogin}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Verifying...' : 'Sign In with PIN'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setIsRegistering(true)}
                >
                  <Text style={styles.switchModeText}>
                    First time here? <Text style={styles.linkText}>Create your account</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* New Employee Registration Form */
              <>
                <Text style={styles.formTitle}>Create Employee Account</Text>
                <Text style={styles.formSubtitle}>
                  Register your account. It will immediately appear on the Boss dashboard.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. David Miller"
                    placeholderTextColor="#64748b"
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department / Trade</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Electrical, Site Engineering, Driver"
                    placeholderTextColor="#64748b"
                    value={regDept}
                    onChangeText={setRegDept}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. david@company.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={regEmail}
                    onChangeText={setRegEmail}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>4-Digit PIN *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 5566"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={6}
                      value={regPin}
                      onChangeText={setRegPin}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Confirm PIN *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter PIN"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={6}
                      value={regConfirmPin}
                      onChangeText={setRegConfirmPin}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Creating Account...' : 'Register & Start Punching'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setIsRegistering(false)}
                >
                  <Text style={styles.switchModeText}>
                    Already have a PIN? <Text style={styles.linkText}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          /* Tab 2: Boss Master Login */
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Master Boss Portal</Text>
            <Text style={styles.formSubtitle}>
              Access live staff monitoring, worksite photo audits, and export attendance sheets.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Email / Username</Text>
              <TextInput
                style={styles.textInput}
                value={bossEmail}
                onChangeText={setBossEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Master Password or PIN</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter Master Password or PIN"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={bossPassword}
                onChangeText={setBossPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.bossPrimaryBtn]}
              onPress={handleBossLogin}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Authenticating...' : 'Sign In as Boss'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%'
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  logoEmoji: {
    fontSize: 32
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  companyName: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4
  },
  companyBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  companyBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    maxWidth: 440,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#0f172a'
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700'
  },
  tabTextActive: {
    color: '#f8fafc'
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  subToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18
  },
  subToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  subToggleBtnActive: {
    backgroundColor: '#1e293b'
  },
  subToggleText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  subToggleTextActive: {
    color: '#38bdf8'
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  formSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18
  },
  inputGroup: {
    marginBottom: 14
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  primaryBtn: {
    backgroundColor: '#059669', // Emerald
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6
  },
  bossPrimaryBtn: {
    backgroundColor: '#2563eb' // Blue
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  switchModeBtn: {
    marginTop: 16,
    alignItems: 'center'
  },
  switchModeText: {
    color: '#94a3b8',
    fontSize: 13
  },
  linkText: {
    color: '#38bdf8',
    fontWeight: '800'
  }
});
