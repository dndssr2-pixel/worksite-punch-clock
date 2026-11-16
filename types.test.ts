import test from 'node:test';
import assert from 'node:assert/strict';
import { PunchType, UserRole } from '../src/types/attendance.ts';
import type { 
  Employee, 
  PunchRecord, 
  ShiftSummary, 
  CompanyConfig 
} from '../src/types/attendance.ts';

test('Type contract: Employee and PunchRecord structure', () => {
  const emp: Employee = {
    id: 'emp_1',
    companyCode: 'CORP100',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    pin: '1234',
    role: 'EMPLOYEE',
    department: 'Operations',
    active: true,
    createdAt: new Date().toISOString()
  };

  const punch: PunchRecord = {
    id: 'punch_1',
    employeeId: 'emp_1',
    companyCode: 'CORP100',
    type: PunchType.IN,
    timestamp: '2026-11-16T09:00:00.000Z',
    photoUri: 'data:image/jpeg;base64,mockphoto',
    photoVerified: true,
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Main Construction Site'
    },
    notes: 'Morning shift start',
    offlineLogged: false
  };

  assert.equal(emp.id, 'emp_1');
  assert.equal(punch.type, 'IN');
  assert.equal(punch.photoVerified, true);
  assert.equal(punch.location?.latitude, 37.7749);
});
