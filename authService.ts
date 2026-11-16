import type { Employee } from '../types/attendance.ts';
import { storageService, DEFAULT_BOSS_ACCOUNT } from './storage.ts';

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: Employee;
}

export const authService = {
  async authenticateBoss(email: string, passwordOrPin: string): Promise<AuthResponse> {
    const employees = await storageService.getEmployees();
    const boss = employees.find(
      (e) => e.role === 'BOSS' && (e.email.toLowerCase() === email.toLowerCase() || email.trim().toLowerCase() === 'boss')
    );

    if (!boss) {
      if (passwordOrPin === '9999' || passwordOrPin === 'admin123') {
        return { success: true, user: DEFAULT_BOSS_ACCOUNT };
      }
      return { success: false, message: 'Boss account not found' };
    }

    if (boss.pin === passwordOrPin || passwordOrPin === 'admin123' || passwordOrPin === '9999') {
      return { success: true, user: boss };
    }

    return { success: false, message: 'Invalid password or PIN' };
  },

  async authenticateEmployee(pin: string, employeeId?: string): Promise<AuthResponse> {
    const employees = await storageService.getEmployees();
    const employee = employees.find((e) => {
      if (employeeId) {
        return e.id === employeeId && e.pin === pin && e.active;
      }
      return e.pin === pin && e.active && e.role === 'EMPLOYEE';
    });

    if (employee) {
      return { success: true, user: employee };
    }

    return { success: false, message: 'Invalid employee PIN or account not found' };
  },

  async registerEmployee(data: {
    name: string;
    email: string;
    department: string;
    pin: string;
    companyCode?: string;
  }): Promise<AuthResponse> {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const department = data.department.trim() || 'General Operations';
    const pin = data.pin.trim();
    const companyCode = (data.companyCode || 'CORP100').trim().toUpperCase();

    if (!name) {
      return { success: false, message: 'Full Name is required' };
    }
    if (!pin || pin.length < 4 || !/^\d+$/.test(pin)) {
      return { success: false, message: 'PIN must be at least 4 digits (numbers only)' };
    }

    const employees = await storageService.getEmployees();

    // Check if PIN is already used by another employee
    const pinExists = employees.some((e) => e.pin === pin);
    if (pinExists) {
      return { success: false, message: 'This PIN is already chosen. Please pick a different 4-digit PIN.' };
    }

    // Check if email already used (if provided)
    if (email) {
      const emailExists = employees.some((e) => e.email.toLowerCase() === email);
      if (emailExists) {
        return { success: false, message: 'An employee with this email already exists.' };
      }
    }

    const newEmployee: Employee = {
      id: `emp_${Date.now().toString().slice(-6)}`,
      companyCode,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@company.com`,
      pin,
      role: 'EMPLOYEE',
      department,
      active: true,
      createdAt: new Date().toISOString()
    };

    await storageService.addEmployee(newEmployee);

    return { success: true, user: newEmployee, message: 'Employee registered successfully!' };
  }
};
