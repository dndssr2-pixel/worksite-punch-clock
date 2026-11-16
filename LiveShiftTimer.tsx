import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { formatDuration } from '../services/calculation.ts';

interface LiveShiftTimerProps {
  isClockedIn: boolean;
  startTimeIso?: string;
}

export const LiveShiftTimer: React.FC<LiveShiftTimerProps> = ({
  isClockedIn,
  startTimeIso
}) => {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const beaconAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isClockedIn) {
      setElapsedMs(0);
      return;
    }

    // Ticking duration
    const startMs = startTimeIso ? new Date(startTimeIso).getTime() : Date.now();
    const updateTimer = () => {
      setElapsedMs(Math.max(0, Date.now() - startMs));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    // Subtle beacon glow pulsation
    const beaconLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beaconAnim, {
          toValue: 0.25,
          duration: 900,
          useNativeDriver: true
        }),
        Animated.timing(beaconAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true
        })
      ])
    );
    beaconLoop.start();

    return () => {
      clearInterval(interval);
      beaconLoop.stop();
    };
  }, [isClockedIn, startTimeIso, beaconAnim]);

  return (
    <View style={[styles.card, isClockedIn ? styles.cardActive : styles.cardIdle]}>
      {/* Top Status Header */}
      <View style={styles.headerRow}>
        <View style={styles.statusIndicator}>
          {isClockedIn ? (
            <Animated.View style={[styles.activeDot, { opacity: beaconAnim }]} />
          ) : (
            <View style={styles.idleDot} />
          )}
          <Text style={styles.label}>
            {isClockedIn ? 'ACTIVE SHIFT IN PROGRESS' : 'CURRENT STATUS'}
          </Text>
        </View>

        {isClockedIn && (
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>● LIVE</Text>
          </View>
        )}
      </View>

      {/* Ticking Numbers */}
      <Text style={[styles.timerText, isClockedIn ? styles.activeTimer : styles.idleTimer]}>
        {isClockedIn ? formatDuration(elapsedMs) : 'CLOCKED OUT'}
      </Text>

      {/* Start Details */}
      {isClockedIn && startTimeIso ? (
        <Text style={styles.startedText}>
          Punched in at: {new Date(startTimeIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
      ) : (
        <Text style={styles.subPrompt}>Tap punch button below to start tracking hours</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827', // Slate 900
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  cardActive: {
    borderColor: '#059669', // Emerald accent
    backgroundColor: 'rgba(5, 150, 105, 0.08)'
  },
  cardIdle: {
    borderColor: '#374151'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowRadius: 6,
    shadowOpacity: 0.9
  },
  idleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6b7280'
  },
  label: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  liveTagText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  timerText: {
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
    marginVertical: 4
  },
  activeTimer: {
    color: '#34d399' // Bright Emerald
  },
  idleTimer: {
    color: '#94a3b8'
  },
  startedText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  subPrompt: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4
  }
});
