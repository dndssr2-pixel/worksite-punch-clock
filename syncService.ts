import { storageService } from './storage.ts';
import type { PunchRecord } from '../types/attendance.ts';

class SyncService {
  private isOnlineStatus: boolean = true;
  private serverApiUrl: string = 'http://localhost:4000/api';

  constructor() {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      this.isOnlineStatus = window.navigator.onLine ?? true;
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.syncPendingPunches();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
      });
    }
  }

  isOnline(): boolean {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      return window.navigator.onLine ?? this.isOnlineStatus;
    }
    return this.isOnlineStatus;
  }

  setServerUrl(url: string) {
    this.serverApiUrl = url;
  }

  async syncWithUploader(
    uploader: (punches: PunchRecord[]) => Promise<string[]>
  ): Promise<number> {
    const pending = await storageService.getOfflinePendingPunches();
    if (pending.length === 0) return 0;

    const successfulIds = await uploader(pending);
    if (successfulIds.length > 0) {
      await storageService.markPunchesSynced(successfulIds);
    }
    return successfulIds.length;
  }

  async syncPendingPunches(): Promise<number> {
    const pending = await storageService.getOfflinePendingPunches();
    if (pending.length === 0) return 0;

    try {
      const syncedIds: string[] = [];
      for (const punch of pending) {
        try {
          const res = await fetch(`${this.serverApiUrl}/punches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(punch)
          });
          if (res.ok) {
            syncedIds.push(punch.id);
          }
        } catch {
          // Server unreachable
        }
      }

      if (syncedIds.length > 0) {
        await storageService.markPunchesSynced(syncedIds);
      }
      return syncedIds.length;
    } catch {
      return 0;
    }
  }
}

export const syncService = new SyncService();
