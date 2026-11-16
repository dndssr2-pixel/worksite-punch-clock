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
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext.tsx';
import { storageService } from '../services/storage.ts';
import { calculateDailyHours, getEmployeeCurrentStatus } from '../services/calculation.ts';
import { shareAttendanceReport } from '../services/exportService.ts';
import { StatCard } from '../components/StatCard.tsx';
import { PhotoAuditModal } from '../components/PhotoAuditModal.tsx';
import { PunchType } from '../types/attendance.ts';
import type { Employee, PunchRecord, ShiftSummary } from '../types/attendance.ts';

export const BossDashboardScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  
  // Photo Audit Modal
  const [auditPunch, setAuditPunch] = useState<PunchRecord | null>(null);
  const [auditEmployee, setAuditEmployee] = useState<Employee | undefined>(undefined);

  // Manual Punch Override Modal
  const [editingPunch, setEditingPunch] = useState<PunchRecord | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideTime, setOverrideTime] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [empList, punchList] = await Promise.all([
        storageService.getEmployees(),
        storageService.getPunchRecords()
      ]);
      setEmployees(empList.filter((e) => e.role === 'EMPLOYEE'));
      setPunches(punchList);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const summaries = calculateDailyHours(punches, 8);
  const todaySummaries = summaries.filter((s) => s.date === todayStr);

  const totalEmployeesCount = employees.length;
  let activeNowCount = 0;
  let clockedOutCount = 0;

  const rosterStatus = employees.map((emp) => {
    const status = getEmployeeCurrentStatus(emp.id, punches);
    if (status.isClockedIn) {
      activeNowCount++;
    } else {
      clockedOutCount++;
    }
    return {
      employee: emp,
      ...status
    };
  });

  const totalHoursToday = todaySummaries.reduce((acc, s) => acc + s.totalHours, 0);

  // Date filtering logic
  const nowMs = Date.now();
  const oneWeekAgoMs = nowMs - 7 * 24 * 3600 * 1000;

  const filteredSummaries = summaries.filter((s) => {
    if (selectedEmployeeFilter !== 'ALL' && s.employeeId !== selectedEmployeeFilter) {
      return false;
    }
    if (dateFilter === 'TODAY' && s.date !== todayStr) {
      return false;
    }
    if (dateFilter === 'WEEK') {
      const sMs = new Date(s.date).getTime();
      if (sMs < oneWeekAgoMs) return false;
    }
    return true;
  });

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const result = await shareAttendanceReport(format, punches, employees, 8);
      if (result.success) {
        Alert.alert('Export Successful', result.message);
      } else {
        Alert.alert('Export Notice', result.message);
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const openAuditModal = (punch: PunchRecord) => {
    const emp = employees.find((e) => e.id === punch.employeeId);
    setAuditPunch(punch);
    setAuditEmployee(emp);
  };

  const openEditModal = (punch: PunchRecord) => {
    setEditingPunch(punch);
    setOverrideTime(punch.timestamp);
    setOverrideReason(punch.overrideReason || '');
  };

  const savePunchOverride = async () => {
    if (!editingPunch) return;
    if (!overrideReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a note/reason for this manual adjustment.');
      return;
    }

    try {
      await storageService.updatePunchRecord(editingPunch.id, {
        timestamp: overrideTime.trim() || editingPunch.timestamp,
        manualOverride: true,
        overrideReason: overrideReason.trim()
      });
      setEditingPunch(null);
      await loadData();
      Alert.alert('Updated', 'Attendance record adjusted successfully with audit trail.');
    } catch {
      Alert.alert('Error', 'Failed to update record.');
    }
  };

  const closeForgottenShift = async (summary: ShiftSummary) => {
    const lastPunch = summary.punches[summary.punches.length - 1];
    if (!lastPunch || lastPunch.type !== PunchType.IN) return;

    // Create closing OUT punch
    const closeTime = new Date(new Date(lastPunch.timestamp).getTime() + 8 * 3600 * 1000).toISOString();
    const closingPunch: PunchRecord = {
      id: `punch_auto_close_${Date.now()}`,
      employeeId: summary.employeeId,
      companyCode: lastPunch.companyCode,
      type: PunchType.OUT,
      timestamp: closeTime,
      photoVerified: false,
      manualOverride: true,
      overrideReason: 'Administrator manual clock-out (Unclosed shift resolution)',
      offlineLogged: false
    };

    await storageService.addPunchRecord(closingPunch);
    await loadData();
    Alert.alert('Shift Closed', 'Standard 8-hour closing punch added for employee.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading Company Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Boss Top Navigation Bar */}
      <View style={styles.appBar}>
        <View>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>MASTER ADMIN</Text>
          </View>
          <Text style={styles.welcomeTitle}>Apex Construction & Field</Text>
          <Text style={styles.subText}>Logged in as: {currentUser?.name || 'Boss'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* Metric Overview Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Staff"
            value={totalEmployeesCount}
            subtext="Registered workers"
            color="#38bdf8"
          />
          <StatCard
            label="Working Now"
            value={activeNowCount}
            subtext="On-site right now"
            color="#10b981"
          />
          <StatCard
            label="Clocked Out"
            value={clockedOutCount}
            subtext="Not on duty"
            color="#94a3b8"
          />
          <StatCard
            label="Hours Today"
            value={`${totalHoursToday.toFixed(1)}h`}
            subtext="Accumulated work"
            color="#f59e0b"
          />
        </View>

        {/* Export Data Sheets Bar */}
        <View style={styles.exportSection}>
          <View style={styles.exportHeader}>
            <Text style={styles.exportSectionTitle}>Attendance Data Sheets</Text>
            <Text style={styles.exportSectionSub}>One-tap export formatted with summary totals & column widths</Text>
          </View>

          <View style={styles.exportButtonRow}>
            <TouchableOpacity
              style={[styles.exportBtn, styles.excelBtn]}
              onPress={() => handleExport('xlsx')}
              disabled={exporting}
            >
              <Text style={styles.exportBtnIcon}>📊</Text>
              <Text style={styles.exportBtnText}>
                {exporting ? 'Generating...' : 'Export Excel (.xlsx)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, styles.csvBtn]}
              onPress={() => handleExport('csv')}
              disabled={exporting}
            >
              <Text style={styles.exportBtnIcon}>📑</Text>
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Employee Roster */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Staff Directory & Live Status</Text>
            <Text style={styles.staffCountTag}>{employees.length} Registered Worker{employees.length !== 1 ? 's' : ''}</Text>
          </View>

          {rosterStatus.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👷‍♂️</Text>
              <Text style={styles.emptyTitle}>No Employees Registered Yet</Text>
              <Text style={styles.emptyText}>
                Employees can open the app and tap "Sign Up (New Staff)" to create their account. Once registered, they will appear here instantly.
              </Text>
            </View>
          ) : (
            rosterStatus.map(({ employee, isClockedIn, lastPunch }) => {
              const isNewStaff = employee.createdAt && (Date.now() - new Date(employee.createdAt).getTime() < 72 * 3600 * 1000);

              return (
                <View key={employee.id} style={styles.rosterCard}>
                  <View style={styles.rosterLeft}>
                    <View style={[styles.statusDot, isClockedIn ? styles.statusDotActive : styles.statusDotInactive]} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.rosterName}>{employee.name}</Text>
                        {isNewStaff && (
                          <View style={styles.newStaffBadge}>
                            <Text style={styles.newStaffBadgeText}>NEW STAFF</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rosterDept}>{employee.department} • PIN: {employee.pin}</Text>
                      <Text style={styles.rosterSub}>
                        {isClockedIn && lastPunch
                          ? `Clocked in at ${new Date(lastPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : (lastPunch ? `Last clocked out` : `Registered • Never punched`)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rosterRight}>
                    {lastPunch?.photoUri ? (
                      <TouchableOpacity onPress={() => openAuditModal(lastPunch)}>
                        <Image source={{ uri: lastPunch.photoUri }} style={styles.rosterPhoto} />
                        <Text style={styles.viewPhotoLabel}>Inspect Photo</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.badge, isClockedIn ? styles.badgeIn : styles.badgeOut]}>
                        <Text style={styles.badgeText}>{isClockedIn ? 'ON SITE' : 'OUT'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Records & History Table */}
        <View style={styles.section}>
          <View style={styles.filterBar}>
            <Text style={styles.sectionHeader}>Attendance Records & History</Text>

            {/* Date Range Selector Filter */}
            <View style={styles.dateFilterRow}>
              <TouchableOpacity
                style={[styles.dateFilterPill, dateFilter === 'ALL' && styles.dateFilterPillActive]}
                onPress={() => setDateFilter('ALL')}
              >
                <Text style={[styles.dateFilterText, dateFilter === 'ALL' && styles.dateFilterTextActive]}>
                  All Records
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateFilterPill, dateFilter === 'TODAY' && styles.dateFilterPillActive]}
                onPress={() => setDateFilter('TODAY')}
              >
                <Text style={[styles.dateFilterText, dateFilter === 'TODAY' && styles.dateFilterTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateFilterPill, dateFilter === 'WEEK' && styles.dateFilterPillActive]}
                onPress={() => setDateFilter('WEEK')}
              >
                <Text style={[styles.dateFilterText, dateFilter === 'WEEK' && styles.dateFilterTextActive]}>
                  This Week
                </Text>
              </TouchableOpacity>
            </View>

            {/* Staff Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.pill, selectedEmployeeFilter === 'ALL' && styles.pillActive]}
                onPress={() => setSelectedEmployeeFilter('ALL')}
              >
                <Text style={[styles.pillText, selectedEmployeeFilter === 'ALL' && styles.pillTextActive]}>
                  All Staff
                </Text>
              </TouchableOpacity>
              {employees.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.pill, selectedEmployeeFilter === e.id && styles.pillActive]}
                  onPress={() => setSelectedEmployeeFilter(e.id)}
                >
                  <Text style={[styles.pillText, selectedEmployeeFilter === e.id && styles.pillTextActive]}>
                    {e.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {filteredSummaries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No attendance records found for this filter.</Text>
            </View>
          ) : (
            filteredSummaries.map((summary, idx) => {
              const emp = employees.find((e) => e.id === summary.employeeId);
              const latestPunch = summary.punches[summary.punches.length - 1];

              return (
                <View key={`${summary.employeeId}_${summary.date}_${idx}`} style={styles.recordCard}>
                  {/* Warning banner for unclosed overnight shifts */}
                  {summary.isOvernightUnclosed && (
                    <View style={styles.warningBanner}>
                      <Text style={styles.warningText}>
                        ⚠️ Currently Active (Overnight / Unclosed)
                      </Text>
                      <TouchableOpacity
                        style={styles.closeShiftBtn}
                        onPress={() => closeForgottenShift(summary)}
                      >
                        <Text style={styles.closeShiftBtnText}>Resolve & Clock Out</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.recordHeader}>
                    <View>
                      <Text style={styles.recordEmpName}>{emp?.name || summary.employeeId}</Text>
                      <Text style={styles.recordDate}>{summary.date} • {emp?.department}</Text>
                    </View>
                    <View style={styles.recordHoursBox}>
                      <Text style={styles.recordHoursText}>{summary.totalHours.toFixed(2)} hrs</Text>
                      {summary.overtimeHours > 0 && (
                        <Text style={styles.overtimeText}>+{summary.overtimeHours.toFixed(2)} OT</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.recordFooter}>
                    <Text style={styles.punchCountText}>
                      {summary.punches.length} punch event{summary.punches.length > 1 ? 's' : ''} recorded
                    </Text>
                    <View style={styles.cardActionRow}>
                      {latestPunch?.photoUri && (
                        <TouchableOpacity
                          style={styles.inspectBtn}
                          onPress={() => openAuditModal(latestPunch)}
                        >
                          <Text style={styles.inspectBtnText}>📷 Photo</Text>
                        </TouchableOpacity>
                      )}
                      {latestPunch && (
                        <TouchableOpacity
                          style={styles.editPunchBtn}
                          onPress={() => openEditModal(latestPunch)}
                        >
                          <Text style={styles.editPunchBtnText}>✏️ Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Photo Audit Inspection Modal */}
      <PhotoAuditModal
        visible={auditPunch !== null}
        punch={auditPunch}
        employee={auditEmployee}
        onClose={() => setAuditPunch(null)}
      />

      {/* Boss Manual Punch Adjustment Modal */}
      <Modal
        visible={editingPunch !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingPunch(null)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Adjust / Correct Punch</Text>
            <Text style={styles.editModalSub}>
              Override punch details with administrator audit notes.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Timestamp (ISO format)</Text>
              <TextInput
                style={styles.textInput}
                value={overrideTime}
                onChangeText={setOverrideTime}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adjustment Reason / Note</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Employee forgot to clock out at gate"
                placeholderTextColor="#64748b"
                value={overrideReason}
                onChangeText={setOverrideReason}
              />
            </View>

            <View style={styles.editModalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingPunch(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={savePunchOverride}
              >
                <Text style={styles.saveBtnText}>Save Adjustment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14
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
  brandBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4
  },
  brandBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  },
  welcomeTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  subText: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16
  },
  exportSection: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  exportHeader: {
    marginBottom: 14
  },
  exportSectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800'
  },
  exportSectionSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  exportButtonRow: {
    flexDirection: 'row',
    gap: 12
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  excelBtn: {
    backgroundColor: '#059669'
  },
  csvBtn: {
    backgroundColor: '#2563eb'
  },
  exportBtnIcon: {
    fontSize: 18
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  staffCountTag: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  newStaffBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  newStaffBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800'
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4
  },
  rosterCard: {
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
  rosterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  statusDotActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowRadius: 6,
    shadowOpacity: 0.8
  },
  statusDotInactive: {
    backgroundColor: '#64748b'
  },
  rosterName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700'
  },
  rosterDept: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1
  },
  rosterSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2
  },
  rosterRight: {
    alignItems: 'center'
  },
  rosterPhoto: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  viewPhotoLabel: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center'
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  badgeIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  badgeOut: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)'
  },
  badgeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800'
  },
  filterBar: {
    marginBottom: 12
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  dateFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155'
  },
  dateFilterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6'
  },
  dateFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  dateFilterTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  filterScroll: {
    flexDirection: 'row',
    marginTop: 4
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  pillActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8'
  },
  pillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  pillTextActive: {
    color: '#0f172a',
    fontWeight: '800'
  },
  recordCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
    flex: 1
  },
  closeShiftBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  closeShiftBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800'
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  recordEmpName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700'
  },
  recordDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  recordHoursBox: {
    alignItems: 'flex-end'
  },
  recordHoursText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '800'
  },
  overtimeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  punchCountText: {
    color: '#64748b',
    fontSize: 12
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8
  },
  inspectBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)'
  },
  inspectBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700'
  },
  editPunchBtn: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  editPunchBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  editModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  editModalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  editModalSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14
  },
  editModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#f8fafc',
    fontWeight: '700'
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
