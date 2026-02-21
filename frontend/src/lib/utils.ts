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
    return "This Session ID is already in use. Please choose a unique name for your session.";
  }
  if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
    return "Your session has expired. Please log in again to continue.";
  }
  if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
    return "You don't have permission to perform this action. Contact your administrator if you believe this is a mistake.";
  }
  if (msg.includes("400") || msg.toLowerCase().includes("bad request")) {
    return "The information provided is invalid. Please check your inputs and try again.";
  }
  if (msg.includes("500") || msg.toLowerCase().includes("internal server error")) {
    return "The server encountered an issue. Please try again in a few moments.";
  }
  if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
    return "Connection error. Please check your internet connection and ensure the server is online.";
  }

  return msg;
}
