/**
 * Système de Notification PUTSCH (Complet & Autonome)
 * Architecture modulaire pour notifications internes sans dépendance externe.
 */

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PutschNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  data?: any;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

export interface PutschPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  vibrationEnabled: boolean;
  priorities: Record<NotificationPriority, boolean>;
}

export interface IPutschAdapter {
  notify(notification: Omit<PutschNotification, 'id' | 'timestamp' | 'status'>): Promise<boolean>;
  updatePreferences(prefs: Partial<PutschPreferences>): void;
  getPreferences(): PutschPreferences;
  processQueue(): Promise<void>;
}

export const DEFAULT_PREFERENCES: PutschPreferences = {
  enabled: true,
  soundEnabled: true,
  soundVolume: 0.5,
  vibrationEnabled: true,
  priorities: {
    low: true,
    medium: true,
    high: true,
    critical: true
  }
};
