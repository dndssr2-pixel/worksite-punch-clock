import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView
} from 'react-native';
import type { PunchRecord, Employee } from '../types/attendance.ts';

interface PhotoAuditModalProps {
  visible: boolean;
  punch: PunchRecord | null;
  employee?: Employee;
  onClose: () => void;
}

export const PhotoAuditModal: React.FC<PhotoAuditModalProps> = ({
  visible,
  punch,
  employee,
  onClose
}) => {
  if (!punch) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Worksite Proof Audit</Text>
              <Text style={styles.subtitle}>
                {employee?.name || punch.employeeId} • {employee?.department || 'Operations'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Full-size Photo Preview */}
            <View style={styles.imageContainer}>
              {punch.photoUri ? (
                <Image
                  source={{ uri: punch.photoUri }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noPhotoBox}>
                  <Text style={styles.noPhotoText}>No photo attached to this record</Text>
                </View>
              )}
            </View>

            {/* Audit Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Punch Type</Text>
                <View style={[styles.badge, punch.type === 'IN' ? styles.badgeIn : styles.badgeOut]}>
                  <Text style={styles.badgeText}>PUNCH {punch.type}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recorded Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(punch.timestamp).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {punch.location?.address || `${punch.location?.latitude || 'N/A'}, ${punch.location?.longitude || 'N/A'}`}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verification Status</Text>
                <Text style={[styles.detailValue, { color: punch.photoVerified ? '#10b981' : '#f59e0b' }]}>
                  {punch.photoVerified ? '✓ Verified Worksite Selfie' : '⚠ Unverified'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Offline Logged</Text>
                <Text style={styles.detailValue}>
                  {punch.offlineLogged ? 'Yes (Synced later)' : 'No (Real-time)'}
                </Text>
              </View>

              {punch.manualOverride && (
                <View style={[styles.detailRow, styles.overrideRow]}>
                  <Text style={[styles.detailLabel, { color: '#f87171' }]}>Manual Override</Text>
                  <Text style={[styles.detailValue, { color: '#f87171' }]}>
                    {punch.overrideReason || 'Adjusted by Administrator'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close Audit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2
  },
  closeBtn: {
    padding: 8
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: '700'
  },
  content: {
    padding: 20
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#020617',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  fullImage: {
    width: '100%',
    height: '100%'
  },
  noPhotoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  noPhotoText: {
    color: '#64748b',
    fontSize: 14
  },
  detailsCard: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  overrideRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 16
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  badgeIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  badgeOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc'
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b'
  },
  doneBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  doneBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14
  }
});
