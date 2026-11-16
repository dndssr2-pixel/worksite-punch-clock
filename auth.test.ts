import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  authService 
} from '../src/services/authService.ts';
import { 
  storageService, 
  initializeDefaultSeedData 
} from '../src/services/storage.ts';

test('authService registers a new employee and allows login', async () => {
  await storageService.clearAll();
  await initializeDefaultSeedData();

  // Register new employee
  const regResult = await authService.registerEmployee({
    name: 'David Miller',
    email: 'david@company.com',
    department: 'Electrical Systems',
    pin: '5566',
    companyCode: 'CORP100'
  });

  assert.equal(regResult.success, true);
  assert.equal(regResult.user?.name, 'David Miller');
  assert.equal(regResult.user?.pin, '5566');

  // Verify can now login with this PIN
  const loginResult = await authService.authenticateEmployee('5566');
  assert.equal(loginResult.success, true);
  assert.equal(loginResult.user?.id, regResult.user?.id);

  // Prevent duplicate PIN
  const dupResult = await authService.registerEmployee({
    name: 'Another Person',
    email: 'another@company.com',
    department: 'Logistics',
    pin: '5566' // Duplicate PIN
  });
  assert.equal(dupResult.success, false);
  assert.ok(dupResult.message?.includes('already chosen'));
});

test('authService verifies master boss account', async () => {
  await storageService.clearAll();
  await initializeDefaultSeedData();

  const valid = await authService.authenticateBoss('boss@company.com', '9999');
  assert.equal(valid.success, true);
  assert.equal(valid.user?.role, 'BOSS');

  const invalid = await authService.authenticateBoss('boss@company.com', 'wrongpassword');
  assert.equal(invalid.success, false);
});
