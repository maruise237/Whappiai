'use client';

import { useEffect, useCallback } from 'react';
import { versionChecker } from '@/lib/version-checker';
import { toast } from 'sonner';

interface VersionCheckProviderProps {
  children: React.ReactNode;
}

export default function VersionCheckProvider({ children }: VersionCheckProviderProps) {
  const handleUpdate = useCallback(() => {
    // Show notification before reload
    toast.info('Nouvelle version disponible ! Rechargement...', {
      duration: 2000,
      description: 'Mise à jour automatique en cours...',
    });
    
    // Give user a moment to see the notification before reload
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, []);

  useEffect(() => {
    // Initialize version checker
    versionChecker.initialize(handleUpdate);
    
    // Cleanup on unmount
    return () => {
      versionChecker.destroy();
    };
  }, [handleUpdate]);

  return <>{children}</>;
}
