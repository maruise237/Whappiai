"use client"

import { toast as sonnerToast } from "sonner"
import { MySwal, showAlert, showConfirm, showLoading } from "@/lib/swal"
import { ReactNode } from "react"

/**
 * Système d'Adaptateur de Notification Complet
 * Centralise l'utilisation de sonner (toasts) et SweetAlert2 (dialogues)
 */

export interface NotificationOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ConfirmOptions {
  title: string
  text: string
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question'
  confirmButtonText?: string
  cancelButtonText?: string
}

export function useNotification() {
  
  /**
   * Toasts (Notifications légères et non-bloquantes)
   */
  const toast = {
    success: (message: string, options?: NotificationOptions) => {
      sonnerToast.success(message, {
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      })
    },
    error: (message: string, options?: NotificationOptions) => {
      sonnerToast.error(message, {
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      })
    },
    info: (message: string, options?: NotificationOptions) => {
      sonnerToast.info(message, {
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      })
    },
    warning: (message: string, options?: NotificationOptions) => {
      sonnerToast.warning(message, {
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      })
    },
    message: (message: string, options?: NotificationOptions) => {
      sonnerToast(message, {
        description: options?.description,
        duration: options?.duration,
        action: options?.action,
      })
    },
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  }

  /**
   * Alertes (Modales d'information bloquantes)
   */
  const alert = {
    success: (title: string, text: string) => showAlert(title, text, 'success'),
    error: (title: string, text: string) => showAlert(title, text, 'error'),
    info: (title: string, text: string) => showAlert(title, text, 'info'),
    warning: (title: string, text: string) => showAlert(title, text, 'warning'),
  }

  /**
   * Confirmation (Modales demandant une action de l'utilisateur)
   */
  const confirm = async (options: ConfirmOptions) => {
    const result = await MySwal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon || 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Confirmer',
      cancelButtonText: options.cancelButtonText || 'Annuler',
    })
    return result.isConfirmed
  }

  /**
   * Chargement (Overlay de chargement bloquant)
   */
  const loading = {
    show: (title?: string) => showLoading(title),
    hide: () => MySwal.close(),
  }

  /**
   * Promesses (Combine toast et état de promesse)
   */
  const promise = <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  }

  return {
    toast,
    alert,
    confirm,
    loading,
    promise,
  }
}
