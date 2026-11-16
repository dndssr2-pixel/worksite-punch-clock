import type { 
  Employee, 
  PunchRecord, 
  CompanyConfig 
} from '../types/attendance.ts';

export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  companyCode: 'CORP100',
  companyName: 'Apex Construction & Field Services',
  masterEmail: 'boss@company.com',
  standardWorkHoursPerDay: 8,
  requirePhotoVerification: true,
  requireLocation: true
};

export const DEFAULT_BOSS_ACCOUNT: Employee = {
  id: 'boss_master',
  companyCode: 'CORP100',
  name: 'Marcus Vance (Boss)',
  email: 'boss@company.com',
  pin: '9999', // Master PIN
  role: 'BOSS',
  department: 'Executive Management',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const DEFAULT_INITIAL_ACCOUNTS: Employee[] = [
  DEFAULT_BOSS_ACCOUNT
];

// Fallback in-memory map for unit tests / SSR / node testing
const memoryStore = new Map<string, string>();

class StorageService {
  private async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      // If running inside React Native with AsyncStorage imported dynamically
      const asyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (asyncStorage && typeof asyncStorage.getItem === 'function') {
        return await asyncStorage.getItem(key);
      }
    } catch {
      // Fallback to memoryStore
    }
    return memoryStore.get(key) || null;
  }

  private async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const asyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (asyncStorage && typeof asyncStorage.setItem === 'function') {
        await asyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback
    }
    memoryStore.set(key, value);
  }

  async clearAll(): Promise<void> {
    memoryStore.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      const asyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (asyncStorage && typeof asyncStorage.clear === 'function') {
        await asyncStorage.clear();
      }
    } catch {
      // ignore
    }
  }

  async getEmployees(): Promise<Employee[]> {
    const data = await this.getItem('company_employees');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveEmployees(employees: Employee[]): Promise<void> {
    await this.setItem('company_employees', JSON.stringify(employees));
  }

  async addEmployee(employee: Employee): Promise<void> {
    const list = await this.getEmployees();
    const existingIdx = list.findIndex(e => e.id === employee.id);
    if (existingIdx >= 0) {
      list[existingIdx] = employee;
    } else {
      list.push(employee);
    }
    await this.saveEmployees(list);
  }

  async getPunchRecords(): Promise<PunchRecord[]> {
    const data = await this.getItem('punch_records');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async addPunchRecord(punch: PunchRecord): Promise<void> {
    const list = await this.getPunchRecords();
    list.push(punch);
    await this.setItem('punch_records', JSON.stringify(list));
  }

  async updatePunchRecord(punchId: string, updates: Partial<PunchRecord>): Promise<void> {
    const list = await this.getPunchRecords();
    const idx = list.findIndex(p => p.id === punchId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      await this.setItem('punch_records', JSON.stringify(list));
    }
  }

  async getOfflinePendingPunches(): Promise<PunchRecord[]> {
    const list = await this.getPunchRecords();
    return list.filter(p => p.offlineLogged);
  }

  async markPunchesSynced(punchIds: string[]): Promise<void> {
    const set = new Set(punchIds);
    const list = await this.getPunchRecords();
    let modified = false;
    for (const punch of list) {
      if (set.has(punch.id)) {
        punch.offlineLogged = false;
        modified = true;
      }
    }
    if (modified) {
      await this.setItem('punch_records', JSON.stringify(list));
    }
  }

  async getCompanyConfig(): Promise<CompanyConfig> {
    const data = await this.getItem('company_config');
    if (!data) return DEFAULT_COMPANY_CONFIG;
    try {
      return { ...DEFAULT_COMPANY_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_COMPANY_CONFIG;
    }
  }

  async saveCompanyConfig(config: CompanyConfig): Promise<void> {
    await this.setItem('company_config', JSON.stringify(config));
  }

  async getActiveSession(): Promise<Employee | null> {
    const data = await this.getItem('active_auth_session');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async setActiveSession(user: Employee | null): Promise<void> {
    if (user) {
      await this.setItem('active_auth_session', JSON.stringify(user));
    } else {
      await this.setItem('active_auth_session', '');
    }
  }
}

export const storageService = new StorageService();

/**
 * Initializes default accounts and sample data if not already present
 */
export async function initializeDefaultSeedData(): Promise<void> {
  const existing = await storageService.getEmployees();
  if (existing.length === 0) {
    await storageService.saveEmployees(DEFAULT_INITIAL_ACCOUNTS);
  } else {
    // Ensure boss account is always present
    const hasBoss = existing.some(e => e.role === 'BOSS');
    if (!hasBoss) {
      existing.unshift(DEFAULT_BOSS_ACCOUNT);
      await storageService.saveEmployees(existing);
    }
  }
  const existingConfig = await storageService.getCompanyConfig();
  if (!existingConfig) {
    await storageService.saveCompanyConfig(DEFAULT_COMPANY_CONFIG);
  }
}
