"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare } from "lucide-react";
import Image from "next/image";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
    }

    // Android / Desktop (Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if not already dismissed recently (could use localStorage)
      const dismissed = localStorage.getItem("install-prompt-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice && !window.matchMedia("(display-mode: standalone)").matches) {
      setIsIOS(true);
      const dismissed = localStorage.getItem("install-prompt-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Hide for a week? or just session? Let's hide for 7 days
    // const now = new Date();
    // const item = {
    //   value: true,
    //   expiry: now.getTime() + 7 * 24 * 60 * 60 * 1000,
    // };
    localStorage.setItem("install-prompt-dismissed", "true");
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-background border border-border shadow-lg rounded-xl p-4 flex flex-col gap-4 relative max-w-md mx-auto">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className="shrink-0 bg-primary/10 p-2 rounded-xl">
            <Image 
              src="/whappi-icon.svg" 
              alt="Whappi Icon" 
              width={48} 
              height={48}
              className="w-12 h-12"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-1">
              Installer Whappi
            </h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez l'application à votre écran d'accueil pour une meilleure expérience.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p className="flex items-center gap-2">
              1. Appuyez sur le bouton de partage <Share size={16} />
            </p>
            <p className="flex items-center gap-2">
              2. Sélectionnez "Sur l'écran d'accueil" <PlusSquare size={16} />
            </p>
          </div>
        ) : (
          <div className="flex gap-2 justify-end mt-2">
             <Button variant="ghost" onClick={handleDismiss} size="sm">
              Plus tard
            </Button>
            <Button onClick={handleInstallClick} size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              Installer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
