import React, { useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View, 
  StyleSheet, 
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';

interface PunchButtonProps {
  isClockedIn: boolean;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const PunchButton: React.FC<PunchButtonProps> = ({
  isClockedIn,
  onPress,
  loading = false,
  disabled = false
}) => {
  // Motion Graphics: Pulse Waves and Scale Spring
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const scalePressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing pulse loop radiating outward
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true
          })
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ])
    );

    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim, pulseOpacity]);

  const handlePressIn = () => {
    Animated.spring(scalePressAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 5,
      tension: 60
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scalePressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50
    }).start();
  };

  const ringColor = isClockedIn ? '#ef4444' : '#10b981';

  return (
    <View style={styles.container}>
      {/* Outer Radiating Motion Pulse Ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: ringColor,
            opacity: pulseOpacity,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      />

      {/* Tactile Spring Pressed Container */}
      <Animated.View style={{ transform: [{ scale: scalePressAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[
            styles.button,
            isClockedIn ? styles.buttonClockOut : styles.buttonClockIn,
            disabled && styles.buttonDisabled
          ]}
        >
          {/* Inner Gloss & Gradient Layer */}
          <View style={styles.innerGlow}>
            {loading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <>
                <View style={styles.statusPill}>
                  <View style={[styles.beaconDot, { backgroundColor: ringColor }]} />
                  <Text style={styles.actionSubtext}>
                    {isClockedIn ? 'ON-SITE WORKING' : 'READY TO WORK'}
                  </Text>
                </View>

                <Text style={styles.actionText}>
                  {isClockedIn ? 'PUNCH OUT' : 'PUNCH IN'}
                </Text>

                <View style={styles.promptBadge}>
                  <Text style={styles.promptText}>
                    {isClockedIn ? 'Tap to end shift / lunch' : 'Tap to snap photo & clock in'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 28,
    position: 'relative'
  },
  pulseRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    zIndex: 0
  },
  button: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 1
  },
  buttonClockIn: {
    backgroundColor: '#047857', // Rich Emerald
    borderColor: '#34d399',
    borderWidth: 4
  },
  buttonClockOut: {
    backgroundColor: '#b91c1c', // Crimson Red
    borderColor: '#f87171',
    borderWidth: 4
  },
  buttonDisabled: {
    opacity: 0.6
  },
  innerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 6
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  actionSubtext: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  actionText: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  promptBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8
  },
  promptText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center'
  }
});
