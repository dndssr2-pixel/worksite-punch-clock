import { PunchType } from '../types/attendance.ts';
import type { PunchRecord, ShiftSummary } from '../types/attendance.ts';

/**
 * Formats a duration in milliseconds into "HHh : MMm : SSs"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/**
 * Checks whether hours exceed standard daily work hours
 */
export function isOvertime(hours: number, standardHours = 8): boolean {
  return hours > standardHours;
}

/**
 * Groups punch records by employee and date (YYYY-MM-DD), calculates total active shift
 * hours and overtime, handling multiple in/out cycles and currently active shifts.
 */
export function calculateDailyHours(
  punches: PunchRecord[],
  standardDailyHours = 8
): ShiftSummary[] {
  // Map key: `${employeeId}:::${date}`
  const groups = new Map<string, PunchRecord[]>();

  for (const punch of punches) {
    const dateStr = punch.timestamp.split('T')[0];
    const key = `${punch.employeeId}:::${dateStr}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(punch);
  }

  const summaries: ShiftSummary[] = [];

  for (const [key, recordList] of groups.entries()) {
    const [employeeId, date] = key.split(':::');

    // Sort chronologically
    const sorted = [...recordList].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalMs = 0;
    let openPunchIn: PunchRecord | null = null;
    let firstPunchIn: string | undefined = undefined;
    let lastPunchOut: string | undefined = undefined;

    for (const punch of sorted) {
      if (punch.type === PunchType.IN) {
        if (!firstPunchIn) {
          firstPunchIn = punch.timestamp;
        }
        openPunchIn = punch;
      } else if (punch.type === PunchType.OUT) {
        lastPunchOut = punch.timestamp;
        if (openPunchIn) {
          const inTime = new Date(openPunchIn.timestamp).getTime();
          const outTime = new Date(punch.timestamp).getTime();
          if (outTime > inTime) {
            totalMs += outTime - inTime;
          }
          openPunchIn = null;
        }
      }
    }

    const isCurrentlyActive = openPunchIn !== null;
    let isOvernightUnclosed = false;

    if (isCurrentlyActive && openPunchIn) {
      const inTime = new Date(openPunchIn.timestamp).getTime();
      const now = Date.now();
      const todayStr = new Date().toISOString().split('T')[0];

      if (date !== todayStr) {
        // Shift originated on a past date and was never clocked out
        isOvernightUnclosed = true;
        // Cap single shift at maximum 12 hours to prevent multi-day runaway hours
        const maxShiftMs = 12 * 3600 * 1000;
        const potentialMs = Math.max(0, now - inTime);
        totalMs += Math.min(potentialMs, maxShiftMs);
      } else {
        if (now > inTime) {
          totalMs += now - inTime;
        }
      }
    }

    const totalHours = Math.round((totalMs / (1000 * 3600)) * 100) / 100;
    const overtimeHours = totalHours > standardDailyHours 
      ? Math.round((totalHours - standardDailyHours) * 100) / 100 
      : 0;

    summaries.push({
      date,
      employeeId,
      totalMs,
      totalHours,
      overtimeHours,
      punches: sorted,
      isCurrentlyActive,
      isOvernightUnclosed,
      firstPunchIn,
      lastPunchOut
    });
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Gets shift status for an employee right now
 */
export function getEmployeeCurrentStatus(
  employeeId: string,
  punches: PunchRecord[]
): { isClockedIn: boolean; lastPunch?: PunchRecord; activeShiftMs: number } {
  const empPunches = punches
    .filter((p) => p.employeeId === employeeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (empPunches.length === 0) {
    return { isClockedIn: false, activeShiftMs: 0 };
  }

  const lastPunch = empPunches[empPunches.length - 1];
  const isClockedIn = lastPunch.type === PunchType.IN;

  let activeShiftMs = 0;
  if (isClockedIn) {
    const inTime = new Date(lastPunch.timestamp).getTime();
    activeShiftMs = Math.max(0, Date.now() - inTime);
  }

  return { isClockedIn, lastPunch, activeShiftMs };
}
