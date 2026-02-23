import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string) {
  if (typeof window === "undefined") return false;

  // Try the modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Clipboard API failed:", err);
    }
  }

  // Fallback to execCommand('copy') for non-secure contexts or if Clipboard API fails
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure the textarea is not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}

export function getFriendlyErrorMessage(error: string | Error): string {
  const msg = typeof error === "string" ? error : error.message;

  if (msg.includes("409") || msg.toLowerCase().includes("already exists")) {
    return "Cet ID de session est déjà utilisé. Veuillez choisir un nom unique pour votre session.";
  }
  if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
    return "Votre session a expiré. Veuillez vous reconnecter pour continuer.";
  }
  if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
    return "Vous n'avez pas l'autorisation d'effectuer cette action. Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.";
  }
  if (msg.includes("400") || msg.toLowerCase().includes("bad request")) {
    return "Les informations fournies sont invalides. Veuillez vérifier vos saisies et réessayer.";
  }
  if (msg.includes("500") || msg.toLowerCase().includes("internal server error")) {
    return "Le serveur a rencontré un problème. Veuillez réessayer dans quelques instants.";
  }
  if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
    return "Erreur de connexion. Veuillez vérifier votre connexion internet et vous assurer que le serveur est en ligne.";
  }

  return msg;
}
