import * as XLSX from 'xlsx';
import { calculateDailyHours } from './calculation.ts';
import type { Employee, PunchRecord } from '../types/attendance.ts';

export interface ExportResult {
  base64: string;
  fileName: string;
  rowCount: number;
}

/**
 * Builds standard RFC 4180 compliant CSV string for attendance records
 */
export function generateAttendanceCsv(
  punches: PunchRecord[],
  employees: Employee[],
  standardDailyHours = 8
): string {
  const summaries = calculateDailyHours(punches, standardDailyHours);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const headers = [
    'Employee ID',
    'Employee Name',
    'Department',
    'Date',
    'First In',
    'Last Out',
    'Total Hours',
    'Overtime (Hrs)',
    'Photo Verified',
    'Status',
    'Notes'
  ];

  const rows: string[] = [headers.join(',')];

  for (const s of summaries) {
    const emp = empMap.get(s.employeeId);
    const empName = emp ? emp.name : s.employeeId;
    const department = emp ? emp.department : 'General';
    const firstIn = s.firstPunchIn ? new Date(s.firstPunchIn).toLocaleTimeString() : '--';
    const lastOut = s.lastPunchOut ? new Date(s.lastPunchOut).toLocaleTimeString() : (s.isCurrentlyActive ? 'Clocked In' : '--');
    const photoVerified = s.punches.every((p) => p.photoVerified) ? 'Yes' : 'Partial/No';
    const status = s.isCurrentlyActive ? 'Active / On Site' : 'Completed';
    const notes = s.punches.map((p) => p.notes).filter(Boolean).join('; ') || 'None';

    const safe = (val: string) => `"${val.replace(/"/g, '""')}"`;

    rows.push([
      safe(s.employeeId),
      safe(empName),
      safe(department),
      safe(s.date),
      safe(firstIn),
      safe(lastOut),
      s.totalHours.toFixed(2),
      s.overtimeHours.toFixed(2),
      safe(photoVerified),
      safe(status),
      safe(notes)
    ].join(','));
  }

  return rows.join('\r\n');
}

/**
 * Builds formatted Excel workbook with summary and audit sheets using SheetJS
 */
export function generateAttendanceExcelData(
  punches: PunchRecord[],
  employees: Employee[],
  standardDailyHours = 8
): ExportResult {
  const summaries = calculateDailyHours(punches, standardDailyHours);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  // Sheet 1: Daily Summary
  const totalRegularHours = summaries.reduce((acc, s) => acc + s.totalHours, 0);
  const totalOvertimeHours = summaries.reduce((acc, s) => acc + s.overtimeHours, 0);

  const summaryData: any[] = summaries.map((s) => {
    const emp = empMap.get(s.employeeId);
    return {
      'Employee ID': s.employeeId,
      'Employee Name': emp ? emp.name : s.employeeId,
      'Department': emp ? emp.department : 'General',
      'Date': s.date,
      'First Punch In': s.firstPunchIn ? new Date(s.firstPunchIn).toLocaleTimeString() : '--',
      'Last Punch Out': s.lastPunchOut ? new Date(s.lastPunchOut).toLocaleTimeString() : (s.isCurrentlyActive ? 'Active' : '--'),
      'Total Hours': s.totalHours,
      'Overtime Hours': s.overtimeHours,
      'Photo Verified': s.punches.every((p) => p.photoVerified) ? 'YES' : 'NO/PARTIAL',
      'Status': s.isOvernightUnclosed 
        ? 'UNCLOSED (OVERNIGHT)' 
        : (s.isCurrentlyActive ? 'CLOCKED IN' : 'COMPLETED'),
      'Punch Count': s.punches.length
    };
  });

  // Append Total Summary Row
  if (summaryData.length > 0) {
    summaryData.push({
      'Employee ID': 'TOTALS',
      'Employee Name': `${summaries.length} Shift Records`,
      'Department': '--',
      'Date': '--',
      'First Punch In': '--',
      'Last Punch Out': '--',
      'Total Hours': Math.round(totalRegularHours * 100) / 100,
      'Overtime Hours': Math.round(totalOvertimeHours * 100) / 100,
      'Photo Verified': '--',
      'Status': 'SUMMARY',
      'Punch Count': punches.length
    });
  }

  // Sheet 2: Raw Punch Audit Logs
  const auditData = punches.map((p) => {
    const emp = empMap.get(p.employeeId);
    return {
      'Punch ID': p.id,
      'Employee Name': emp ? emp.name : p.employeeId,
      'Type': p.type,
      'Timestamp': p.timestamp,
      'Photo Verified': p.photoVerified ? 'YES' : 'NO',
      'Location': p.location?.address || (p.location ? `${p.location.latitude}, ${p.location.longitude}` : 'Unknown'),
      'Offline Logged': p.offlineLogged ? 'YES' : 'NO',
      'Manual Override': p.manualOverride ? 'YES' : 'NO',
      'Notes / Reason': p.overrideReason || p.notes || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryData.length > 0 ? summaryData : [{ 'Status': 'No records' }]);
  const wsAudit = XLSX.utils.json_to_sheet(auditData.length > 0 ? auditData : [{ 'Status': 'No punch logs' }]);

  // Configure Column Widths (!cols) for clean spreadsheet presentation
  wsSummary['!cols'] = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 24 }, // Department
    { wch: 14 }, // Date
    { wch: 18 }, // First In
    { wch: 18 }, // Last Out
    { wch: 14 }, // Total Hours
    { wch: 16 }, // Overtime Hours
    { wch: 16 }, // Photo Verified
    { wch: 24 }, // Status
    { wch: 14 }  // Punch Count
  ];

  wsAudit['!cols'] = [
    { wch: 26 }, // Punch ID
    { wch: 22 }, // Employee Name
    { wch: 10 }, // Type
    { wch: 26 }, // Timestamp
    { wch: 16 }, // Photo Verified
    { wch: 34 }, // Location
    { wch: 16 }, // Offline Logged
    { wch: 16 }, // Manual Override
    { wch: 36 }  // Notes / Reason
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Attendance Summary');
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Logs');

  const dateTag = new Date().toISOString().split('T')[0];
  const fileName = `Attendance_Report_${dateTag}.xlsx`;

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  return {
    base64,
    fileName,
    rowCount: summaries.length
  };
}

/**
 * Triggers native OS sharing (or web browser download fallback)
 */
export async function shareAttendanceReport(
  format: 'xlsx' | 'csv',
  punches: PunchRecord[],
  employees: Employee[],
  standardDailyHours = 8
): Promise<{ success: boolean; message: string; uri?: string }> {
  try {
    const dateTag = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const csvContent = generateAttendanceCsv(punches, employees, standardDailyHours);
      const fileName = `Attendance_Report_${dateTag}.csv`;

      // Check if running on web
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, message: `Downloaded ${fileName}` };
      }

      // Check if running in React Native with expo-file-system & expo-sharing
      try {
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Attendance CSV'
          });
          return { success: true, message: 'Shared CSV file successfully', uri: fileUri };
        }
      } catch {
        // Fallback
      }

      return { success: true, message: 'Generated CSV data' };
    } else {
      // XLSX export
      const excelData = generateAttendanceExcelData(punches, employees, standardDailyHours);

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const byteCharacters = atob(excelData.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = excelData.fileName;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, message: `Downloaded ${excelData.fileName}` };
      }

      try {
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');
        const fileUri = `${FileSystem.cacheDirectory}${excelData.fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, excelData.base64, {
          encoding: FileSystem.EncodingType.Base64
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Attendance Excel Sheet'
          });
          return { success: true, message: 'Shared Excel file successfully', uri: fileUri };
        }
      } catch {
        // Fallback
      }

      return { success: true, message: 'Generated Excel file' };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Export failed' };
  }
}
