import test from 'node:test';
import assert from 'node:assert/strict';
import { PunchType } from '../src/types/attendance.ts';
import type { PunchRecord } from '../src/types/attendance.ts';
import { 
  formatDuration, 
  calculateDailyHours, 
  isOvertime 
} from '../src/services/calculation.ts';

test('formatDuration converts milliseconds to formatted string HH:MM:SS', () => {
  const oneHour30Min15Sec = (1 * 3600 + 30 * 60 + 15) * 1000;
  assert.equal(formatDuration(oneHour30Min15Sec), '01h : 30m : 15s');

  const zero = 0;
  assert.equal(formatDuration(zero), '00h : 00m : 00s');
});

test('calculateDailyHours calculates single standard shift (8 hours)', () => {
  const punches: PunchRecord[] = [
    {
      id: 'p1',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.IN,
      timestamp: '2026-11-16T09:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    },
    {
      id: 'p2',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.OUT,
      timestamp: '2026-11-16T17:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    }
  ];

  const summaries = calculateDailyHours(punches, 8);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].date, '2026-11-16');
  assert.equal(summaries[0].totalHours, 8.0);
  assert.equal(summaries[0].overtimeHours, 0.0);
  assert.equal(summaries[0].isCurrentlyActive, false);
});

test('calculateDailyHours caps runaway hours for unclosed overnight shift from previous days', () => {
  // Employee clocked in 3 days ago and forgot to clock out
  const punches: PunchRecord[] = [
    {
      id: 'p_old',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.IN,
      timestamp: '2026-11-10T09:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    }
  ];

  const summaries = calculateDailyHours(punches, 8);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].isCurrentlyActive, true);
  assert.equal(summaries[0].isOvernightUnclosed, true);
  // Must be capped (e.g. 12 hours max) rather than runaway 100+ hours!
  assert.equal(summaries[0].totalHours <= 12.0, true);
});

test('calculateDailyHours aggregates multiple punches with lunch break and detects overtime', () => {
  const punches: PunchRecord[] = [
    {
      id: 'p1',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.IN,
      timestamp: '2026-11-16T09:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    },
    {
      id: 'p2',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.OUT,
      timestamp: '2026-11-16T13:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    },
    {
      id: 'p3',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.IN,
      timestamp: '2026-11-16T14:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    },
    {
      id: 'p4',
      employeeId: 'emp_1',
      companyCode: 'CORP100',
      type: PunchType.OUT,
      timestamp: '2026-11-16T20:00:00.000Z',
      photoVerified: true,
      offlineLogged: false
    }
  ];

  const summaries = calculateDailyHours(punches, 8);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].totalHours, 10.0);
  assert.equal(summaries[0].overtimeHours, 2.0);
  assert.equal(isOvertime(summaries[0].totalHours, 8), true);
});
