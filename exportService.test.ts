import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateAttendanceCsv, 
  generateAttendanceExcelData 
} from '../src/services/exportService.ts';
import { PunchType } from '../src/types/attendance.ts';
import type { Employee, PunchRecord } from '../src/types/attendance.ts';

const mockEmployees: Employee[] = [
  {
    id: 'emp_1',
    companyCode: 'CORP100',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    pin: '1001',
    role: 'EMPLOYEE',
    department: 'Site Engineering',
    active: true,
    createdAt: '2026-01-01'
  }
];

const mockPunches: PunchRecord[] = [
  {
    id: 'p1',
    employeeId: 'emp_1',
    companyCode: 'CORP100',
    type: PunchType.IN,
    timestamp: '2026-11-16T09:00:00.000Z',
    photoVerified: true,
    location: { latitude: 37.77, longitude: -122.41, address: 'Site Gate A' },
    offlineLogged: false,
    notes: 'Morning entry'
  },
  {
    id: 'p2',
    employeeId: 'emp_1',
    companyCode: 'CORP100',
    type: PunchType.OUT,
    timestamp: '2026-11-16T18:00:00.000Z',
    photoVerified: true,
    offlineLogged: false,
    notes: 'Shift end'
  }
];

test('generateAttendanceCsv generates properly formatted CSV with audit columns', () => {
  const csv = generateAttendanceCsv(mockPunches, mockEmployees, 8);
  assert.ok(csv);

  // Check headers
  assert.ok(csv.includes('Employee ID,Employee Name,Department,Date,First In,Last Out,Total Hours,Overtime (Hrs),Photo Verified,Status,Notes'));

  // Check data row
  assert.ok(csv.includes('emp_1'));
  assert.ok(csv.includes('Alice Johnson'));
  assert.ok(csv.includes('Site Engineering'));
  assert.ok(csv.includes('2026-11-16'));
  assert.ok(csv.includes('9.00')); // 9 hours worked
  assert.ok(csv.includes('1.00')); // 1 hour overtime
  assert.ok(csv.includes('Yes')); // Photo verified
});

test('generateAttendanceExcelData creates valid base64 Excel workbook', () => {
  const result = generateAttendanceExcelData(mockPunches, mockEmployees, 8);
  assert.ok(result);
  assert.ok(result.base64.length > 50);
  assert.ok(result.fileName.endsWith('.xlsx'));
  assert.equal(result.rowCount, 1);
});
