"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare, Download } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface InstallPromptProps {
  className?: string;
  variant?: "floating" | "inline";
}

export function InstallPrompt({ className, variant = "floating" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showFab, setShowFab] = useState(false); 
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };
    const mobile = checkMobile();
    setIsMobile(mobile);

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered', reg))
        .catch((err) => console.log('Service Worker registration failed', err));
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }

    // Default state: Show FAB initially on mobile if not installed (non-intrusive)
    if (mobile && !window.matchMedia("(display-mode: standalone)").matches) {
        setShowFab(true);
    }

    // Android / Desktop (Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("beforeinstallprompt fired", e);
      // Ensure FAB is visible when event fires
      setShowFab(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice) {
      setIsIOS(true);
      // Ensure FAB is visible on iOS
      setShowFab(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log("Install clicked, deferredPrompt:", deferredPrompt);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("User choice outcome:", outcome);
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowPrompt(false);
        setShowFab(false);
      }
    } else if (isIOS) {
        // For iOS, just showing instructions is handled by the dialog render
    } else {
      console.log("No deferredPrompt available");
      // Fallback: show manual instructions if prompt fails
      // We will render a different UI state for this in the popup
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowFab(true); // Return to FAB mode
  };

  const handleFabClick = () => {
    setShowPrompt(true);
    setShowFab(false);
  };

  if (isStandalone) return null;
  if (!isMobile) return null;

  // Discreet Install Button (Pill style)
  if (!showPrompt && showFab) {
    if (variant === "inline") {
      return (
        <button
          onClick={handleFabClick}
          className={cn(
            "flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-1.5 rounded-full text-xs font-medium border border-[#25D366]/20 transition-all animate-in fade-in whitespace-nowrap",
            className
          )}
        >
           Installer
        </button>
      );
    }

    return (
      <button
        onClick={handleFabClick}
        className={cn(
          "fixed top-4 right-16 z-50 flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-1.5 rounded-full text-xs font-medium border border-[#25D366]/20 backdrop-blur-sm transition-all animate-in fade-in",
          className
        )}
      >
        Installer l'app
      </button>
    );
  }

  if (!showPrompt) return null;

  const showManualInstructions = !deferredPrompt && !isIOS;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-background border border-border shadow-xl rounded-xl p-5 flex flex-col gap-4 relative w-full max-w-sm animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                <Image 
                src="/whappi-icon.svg" 
                alt="Whappi Icon" 
                fill
                className="object-cover"
                />
            </div>
            <div className="space-y-1">
                <h3 className="font-semibold text-xl">Installer l'App Whappi</h3>
                <p className="text-sm text-muted-foreground">
                Profitez d'une expérience fluide et native directement sur votre appareil.
                </p>
            </div>
        </div>

        {isIOS ? (
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3 text-left">
            <p className="font-medium text-foreground">Sur iOS :</p>
            <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2">
                1. Appuyez sur Partager <Share size={16} />
                </p>
                <p className="flex items-center gap-2">
                2. Choisissez "Sur l'écran d'accueil" <PlusSquare size={16} />
                </p>
            </div>
          </div>
        ) : showManualInstructions ? (
           <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3 text-left">
            <p className="font-medium text-foreground">Installation manuelle :</p>
            <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2">
                1. Ouvrez le menu du navigateur (3 points)
                </p>
                <p className="flex items-center gap-2">
                2. Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"
                </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 mt-2">
            <Button onClick={handleInstallClick} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold h-11">
              Installer maintenant
            </Button>
             <Button variant="ghost" onClick={handleDismiss} className="w-full">
              Pas maintenant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
