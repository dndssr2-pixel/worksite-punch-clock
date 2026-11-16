import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  storageService, 
  initializeDefaultSeedData, 
  DEFAULT_BOSS_ACCOUNT 
} from '../src/services/storage.ts';
import { PunchType } from '../src/types/attendance.ts';

test('StorageService initializes seed data with Master Boss account', async () => {
  await storageService.clearAll();
  await initializeDefaultSeedData();

  const employees = await storageService.getEmployees();
  assert.equal(employees.length >= 1, true);

  const boss = employees.find(e => e.role === 'BOSS');
  assert.ok(boss);
  assert.equal(boss?.email, DEFAULT_BOSS_ACCOUNT.email);
});

test('StorageService adds and retrieves punch records with offline flag', async () => {
  await storageService.clearAll();
  await initializeDefaultSeedData();

  const newPunch = {
    id: 'test_p_1',
    employeeId: 'emp_1',
    companyCode: 'CORP100',
    type: PunchType.IN,
    timestamp: new Date().toISOString(),
    photoUri: 'data:image/jpeg;base64,mockselfie',
    photoVerified: true,
    location: { latitude: 37.77, longitude: -122.41, address: 'Site HQ' },
    offlineLogged: true
  };

  await storageService.addPunchRecord(newPunch);

  const punches = await storageService.getPunchRecords();
  assert.equal(punches.length, 1);
  assert.equal(punches[0].id, 'test_p_1');
  assert.equal(punches[0].photoVerified, true);
  assert.equal(punches[0].offlineLogged, true);

  const pending = await storageService.getOfflinePendingPunches();
  assert.equal(pending.length, 1);

  await storageService.markPunchesSynced(['test_p_1']);
  const pendingAfter = await storageService.getOfflinePendingPunches();
  assert.equal(pendingAfter.length, 0);
});

test('StorageService allows boss to manually correct punch times with audit trail', async () => {
  await storageService.clearAll();
  
  const punch = {
    id: 'p_override',
    employeeId: 'emp_2',
    companyCode: 'CORP100',
    type: PunchType.OUT,
    timestamp: '2026-11-16T17:00:00.000Z',
    photoVerified: false,
    offlineLogged: false
  };

  await storageService.addPunchRecord(punch);

  await storageService.updatePunchRecord('p_override', {
    timestamp: '2026-11-16T18:00:00.000Z',
    manualOverride: true,
    overrideReason: 'Employee forgot to punch out before site closure'
  });

  const updated = (await storageService.getPunchRecords()).find(p => p.id === 'p_override');
  assert.equal(updated?.timestamp, '2026-11-16T18:00:00.000Z');
  assert.equal(updated?.manualOverride, true);
  assert.equal(updated?.overrideReason, 'Employee forgot to punch out before site closure');
});
