/**
 * Version Check Service
 * Detects application updates and forces cache refresh to prevent black screen issues
 */

const APP_VERSION_KEY = 'whappi_app_version';
const VERSION_CHECK_INTERVAL = 120000; // 2 minutes

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion?: string;
  serverVersion?: string;
}

export class VersionChecker {
  private static instance: VersionChecker;
  private checkInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): VersionChecker {
    if (!VersionChecker.instance) {
      VersionChecker.instance = new VersionChecker();
    }
    return VersionChecker.instance;
  }

  /**
   * Initialize version checking service
   * Call this in your app's root component or layout
   */
  public initialize(onUpdate?: () => void): void {
    this.onUpdateCallback = onUpdate || null;
    
    // Initial check
    this.checkVersion();
    
    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkVersion();
    }, VERSION_CHECK_INTERVAL);
  }

  /**
   * Stop version checking
   * Call this when unmounting the app
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for new version
   */
  public async checkVersion(): Promise<VersionCheckResult> {
    try {
      const response = await fetch('/api/health', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      const serverVersion = data.version;
      
      if (!serverVersion) {
        console.warn('[VersionChecker] No version in health response');
        return { hasUpdate: false };
      }

      const storedVersion = localStorage.getItem(APP_VERSION_KEY);
      
      // Store version if not present
      if (!storedVersion) {
        localStorage.setItem(APP_VERSION_KEY, serverVersion);
        return { hasUpdate: false, currentVersion: serverVersion, serverVersion };
      }

      // Compare versions
      if (storedVersion !== serverVersion) {
        console.log(`[VersionChecker] Update detected: ${storedVersion} -> ${serverVersion}`);
        
        // Clear all caches
        await this.clearCaches();
        
        // Update stored version
        localStorage.setItem(APP_VERSION_KEY, serverVersion);
        
        // Trigger update callback
        if (this.onUpdateCallback) {
          this.onUpdateCallback();
        } else {
          // Default behavior: force reload
          window.location.reload();
        }

        return { 
          hasUpdate: true, 
          currentVersion: storedVersion, 
          serverVersion 
        };
      }

      return { hasUpdate: false, currentVersion: storedVersion, serverVersion };
      
    } catch (error) {
      console.error('[VersionChecker] Error checking version:', error);
      return { hasUpdate: false };
    }
  }

  /**
   * Clear all browser caches and service workers
   */
  private async clearCaches(): Promise<void> {
    try {
      // Clear Cache Storage API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
        console.log('[VersionChecker] Cache storage cleared');
      }

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('[VersionChecker] Service workers unregistered');
      }

      // Clear localStorage (except essential data)
      const essentialKeys = [
        'clerk-client-id',
        '__session',
        '__client_uat',
        'whappi_app_version'
      ];
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !essentialKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[VersionChecker] Removed ${keysToRemove.length} non-essential localStorage items`);

      // Clear sessionStorage
      sessionStorage.clear();
      console.log('[VersionChecker] SessionStorage cleared');

    } catch (error) {
      console.error('[VersionChecker] Error clearing caches:', error);
    }
  }

  /**
   * Force immediate cache clear and reload
   * Can be called manually if needed
   */
  public async forceRefresh(): Promise<void> {
    console.log('[VersionChecker] Forcing cache refresh...');
    await this.clearCaches();
    window.location.reload();
  }
}

// Export singleton instance
export const versionChecker = VersionChecker.getInstance();

/**
 * React Hook for version checking
 * Usage: useVersionCheck(() => { /* handle update *\/ })
 */
export function useVersionCheck(onUpdate?: () => void) {
  const { useEffect } = require('react');
  
  useEffect(() => {
    const checker = VersionChecker.getInstance();
    checker.initialize(onUpdate);
    
    return () => {
      checker.destroy();
    };
  }, [onUpdate]);
}
