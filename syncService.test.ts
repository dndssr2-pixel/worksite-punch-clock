import test from 'node:test';
import assert from 'node:assert/strict';
import { syncService } from '../src/services/syncService.ts';
import { storageService } from '../src/services/storage.ts';
import { PunchType } from '../src/types/attendance.ts';

test('syncService queues offline punch and syncs with server API', async () => {
  await storageService.clearAll();

  // Add an offline punch
  const offlinePunch = {
    id: 'offline_test_1',
    employeeId: 'emp_1',
    companyCode: 'CORP100',
    type: PunchType.IN,
    timestamp: new Date().toISOString(),
    photoVerified: true,
    offlineLogged: true
  };

  await storageService.addPunchRecord(offlinePunch);

  const pendingBefore = await storageService.getOfflinePendingPunches();
  assert.equal(pendingBefore.length, 1);

  // Mock server sync
  const mockUploader = async (punches: any[]) => {
    return punches.map(p => p.id);
  };

  const syncedCount = await syncService.syncWithUploader(mockUploader);
  assert.equal(syncedCount, 1);

  const pendingAfter = await storageService.getOfflinePendingPunches();
  assert.equal(pendingAfter.length, 0);
});
