import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Image,
  Animated
} from 'react-native';
import { useAuth } from '../context/AuthContext.tsx';
import { storageService } from '../services/storage.ts';
import { syncService } from '../services/syncService.ts';
import { getEmployeeCurrentStatus } from '../services/calculation.ts';
import { PunchButton } from '../components/PunchButton.tsx';
import { LiveShiftTimer } from '../components/LiveShiftTimer.tsx';
import { CameraCaptureModal } from '../components/CameraCaptureModal.tsx';
import { PhotoAuditModal } from '../components/PhotoAuditModal.tsx';
import { PunchType } from '../types/attendance.ts';
import type { PunchRecord, LocationCoords } from '../types/attendance.ts';

export const EmployeeScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraModalVisible, setCameraModalVisible] = useState<boolean>(false);
  const [auditPunch, setAuditPunch] = useState<PunchRecord | null>(null);
  const [pendingNotes, setPendingNotes] = useState<string>('');

  // Screen entrance motion
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadPunches = useCallback(async () => {
    if (!currentUser) return;
    const all = await storageService.getPunchRecords();
    const myPunches = all
      .filter((p) => p.employeeId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setPunches(myPunches);
  }, [currentUser]);

  useEffect(() => {
    loadPunches();
  }, [loadPunches]);

  if (!currentUser) return null;

  const { isClockedIn, lastPunch } = getEmployeeCurrentStatus(currentUser.id, punches);

  const handlePunchTrigger = () => {
    setCameraModalVisible(true);
  };

  const handlePhotoCaptured = async (photoUri: string, location?: LocationCoords, photoVerified = true) => {
    setCameraModalVisible(false);
    setLoading(true);

    try {
      const isOnline = syncService.isOnline();
      const nextType = isClockedIn ? PunchType.OUT : PunchType.IN;
      const newPunch: PunchRecord = {
        id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: currentUser.id,
        companyCode: currentUser.companyCode,
        type: nextType,
        timestamp: new Date().toISOString(),
        photoUri: photoUri || undefined,
        photoVerified,
        location,
        notes: pendingNotes.trim() ? pendingNotes.trim() : (!photoVerified ? '[UNVERIFIED: Camera Access Denied]' : undefined),
        offlineLogged: !isOnline
      };

      await storageService.addPunchRecord(newPunch);
      setPendingNotes('');
      await loadPunches();

      if (isOnline) {
        // Trigger background sync with server if online
        syncService.syncPendingPunches().catch(() => {});
      }
    } catch {
      Alert.alert('Error', 'Failed to record punch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.welcomeTitle}>Hello, {currentUser.name}</Text>
          <Text style={styles.companySub}>
            {currentUser.department} • ID: {currentUser.id}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Live Timer Card */}
        <LiveShiftTimer
          isClockedIn={isClockedIn}
          startTimeIso={isClockedIn && lastPunch ? lastPunch.timestamp : undefined}
        />

        {/* Optional Notes Input */}
        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            placeholder={isClockedIn ? "Optional: Note before clocking out..." : "Optional: Shift start note / location note..."}
            placeholderTextColor="#64748b"
            value={pendingNotes}
            onChangeText={setPendingNotes}
          />
        </View>

        {/* Interactive Punch Button */}
        <PunchButton
          isClockedIn={isClockedIn}
          onPress={handlePunchTrigger}
          loading={loading}
        />

        {/* Punch Verification Info Callout */}
        <View style={styles.infoCallout}>
          <Text style={styles.infoCalloutIcon}>📸</Text>
          <Text style={styles.infoCalloutText}>
            Worksite photo verification is required. Every punch records your site selfie and GPS location for company records.
          </Text>
        </View>

        {/* Personal Punch History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>My Recent Punches</Text>
          {punches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No punch history yet. Tap the button above to punch in!</Text>
            </View>
          ) : (
            punches.slice(0, 10).map((punch) => {
              const punchDate = new Date(punch.timestamp);
              const isPunchIn = punch.type === PunchType.IN;

              return (
                <TouchableOpacity
                  key={punch.id}
                  style={styles.punchItem}
                  onPress={() => setAuditPunch(punch)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.typeIcon, isPunchIn ? styles.typeIconIn : styles.typeIconOut]}>
                      <Text style={styles.typeIconText}>{isPunchIn ? 'IN' : 'OUT'}</Text>
                    </View>
                    <View>
                      <Text style={styles.itemDate}>
                        {punchDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.itemTime}>
                        {punchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {punch.notes && (
                        <Text style={styles.itemNote} numberOfLines={1}>
                          "{punch.notes}"
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    {punch.photoUri && (
                      <Image
                        source={{ uri: punch.photoUri }}
                        style={styles.thumbImage}
                      />
                    )}
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>✓ Verified</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </Animated.View>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        visible={cameraModalVisible}
        actionType={isClockedIn ? 'OUT' : 'IN'}
        onCaptureConfirm={handlePhotoCaptured}
        onCancel={() => setCameraModalVisible(false)}
      />

      {/* Full Photo Audit Modal */}
      <PhotoAuditModal
        visible={auditPunch !== null}
        punch={auditPunch}
        employee={currentUser}
        onClose={() => setAuditPunch(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  welcomeTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  companySub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155'
  },
  logoutText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  notesContainer: {
    marginBottom: 8
  },
  notesInput: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginBottom: 20
  },
  infoCalloutIcon: {
    fontSize: 20,
    marginRight: 10
  },
  infoCalloutText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18
  },
  historySection: {
    marginTop: 8
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center'
  },
  punchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  typeIconIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  typeIconOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  typeIconText: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 13
  },
  itemDate: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  itemTime: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1
  },
  itemNote: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 160
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6
  },
  thumbImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  verifiedTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6
  },
  verifiedTagText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700'
  }
});
