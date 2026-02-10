import { 
  IPutschAdapter, 
  PutschNotification, 
  PutschPreferences, 
  DEFAULT_PREFERENCES 
} from './putsch-types';
import { toast } from 'sonner';

class PutschNotificationAdapter implements IPutschAdapter {
  private static instance: PutschNotificationAdapter;
  private preferences: PutschPreferences;
  private queue: PutschNotification[] = [];
  private isProcessing: boolean = false;
  private audioContext: AudioContext | null = null;

  private constructor() {
    // Charger les préférences depuis le localStorage
    const savedPrefs = typeof window !== 'undefined' ? localStorage.getItem('putsch_prefs') : null;
    this.preferences = savedPrefs ? { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) } : DEFAULT_PREFERENCES;
  }

  public static getInstance(): PutschNotificationAdapter {
    if (!PutschNotificationAdapter.instance) {
      PutschNotificationAdapter.instance = new PutschNotificationAdapter();
    }
    return PutschNotificationAdapter.instance;
  }

  public getPreferences(): PutschPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(prefs: Partial<PutschPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    if (typeof window !== 'undefined') {
      localStorage.setItem('putsch_prefs', JSON.stringify(this.preferences));
    }
  }

  public async notify(notif: Omit<PutschNotification, 'id' | 'timestamp' | 'status'>): Promise<boolean> {
    if (!this.preferences.enabled || !this.preferences.priorities[notif.priority]) {
      return false;
    }

    const notification: PutschNotification = {
      ...notif,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      status: 'pending'
    };

    this.queue.push(notification);
    this.processQueue();
    return true;
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      if (!notification) continue;

      try {
        await this.deliverNotification(notification);
        notification.status = 'processed';
      } catch (error: any) {
        notification.status = 'failed';
        notification.error = error.message;
        console.error('PUTSCH Delivery Error:', error);
        // Mécanisme de fallback simple : Log console si tout échoue
      }
    }

    this.isProcessing = false;
  }

  private async deliverNotification(notification: PutschNotification): Promise<void> {
    // 1. Formatage & Affichage visuel (via Sonner)
    this.showVisualToast(notification);

    // 2. Notification sonore (si activée)
    if (this.preferences.soundEnabled) {
      await this.playNotificationSound(notification.priority);
    }

    // 3. Vibration (si supportée et activée)
    if (this.preferences.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(this.getVibrationPattern(notification.priority));
    }
  }

  private showVisualToast(notif: PutschNotification) {
    const options = {
      description: notif.message,
      duration: notif.priority === 'critical' ? 10000 : 5000,
    };

    switch (notif.priority) {
      case 'critical':
        toast.error(notif.title, options);
        break;
      case 'high':
        toast.warning(notif.title, options);
        break;
      default:
        toast.info(notif.title, options);
    }
  }

  private async playNotificationSound(priority: string): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Fréquences différentes selon la priorité
      let frequency = 440; // A4 (Standard)
      if (priority === 'critical') frequency = 880; // A5 (Aigu)
      if (priority === 'low') frequency = 220; // A3 (Grave)

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.preferences.soundVolume, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio feedback failed (user interaction might be required first):', e);
    }
  }

  private getVibrationPattern(priority: string): number[] {
    switch (priority) {
      case 'critical': return [200, 100, 200, 100, 200];
      case 'high': return [300, 100, 300];
      default: return [100];
    }
  }
}

export const putsch = PutschNotificationAdapter.getInstance();
