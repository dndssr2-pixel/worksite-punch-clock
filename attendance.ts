export const UserRole = {
  BOSS: 'BOSS',
  EMPLOYEE: 'EMPLOYEE'
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PunchType = {
  IN: 'IN',
  OUT: 'OUT'
} as const;
export type PunchType = (typeof PunchType)[keyof typeof PunchType];

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface Employee {
  id: string;
  companyCode: string;
  name: string;
  email: string;
  pin: string; // 4-digit PIN for quick employee login
  role: 'BOSS' | 'EMPLOYEE';
  department: string;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface PunchRecord {
  id: string;
  employeeId: string;
  companyCode: string;
  type: PunchType;
  timestamp: string; // ISO 8601
  photoUri?: string; // Verification selfie / worksite photo base64 or URI
  photoVerified: boolean;
  location?: LocationCoords;
  notes?: string;
  offlineLogged: boolean;
  manualOverride?: boolean;
  overrideReason?: string;
}

export interface ShiftSummary {
  date: string; // YYYY-MM-DD
  employeeId: string;
  totalMs: number;
  totalHours: number;
  overtimeHours: number; // Hours worked past standard daily shift (e.g. > 8 hrs)
  punches: PunchRecord[];
  isCurrentlyActive: boolean;
  isOvernightUnclosed?: boolean; // Highlighted when a punch from a previous day was never punched out
  firstPunchIn?: string;
  lastPunchOut?: string;
}

export interface CompanyConfig {
  companyCode: string;
  companyName: string;
  masterEmail: string;
  standardWorkHoursPerDay: number; // default 8
  requirePhotoVerification: boolean;
  requireLocation: boolean;
}
