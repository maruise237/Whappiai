"use client"

import { useEffect } from "react"
import { useWappy } from "@/providers/wappy-provider"
import { useWebSocket } from "@/providers/websocket-provider"

/**
 * WappyConnector - pont entre les événements de l'app et l'état de Wappy
 * Écoute les WebSocket et les events DOM pour animer la mascotte
 */
export function WappyConnector() {
  const { setState } = useWappy()
  const { lastMessage } = useWebSocket()

  // Écouter les messages WebSocket
  useEffect(() => {
    if (!lastMessage) return

    const d = lastMessage

    // Connexion/déconnexion Evolution
    if (d.type === "session-update") {
      const data = Array.isArray(d.data) ? d.data : [d.data]
      for (const update of data) {
        const status = (update.status || "").toLowerCase()
        if (status === "connected" || status === "open") {
          setState("happy", 4000)
        } else if (status === "disconnected" || status === "close") {
          setState("sad", 5000)
        } else if (status === "connecting") {
          setState("working", 3000)
        }
      }
    }

    // Modération: lien bloqué
    if (d.type === "moderation" && d.action === "link-blocked") {
      setState("alert", 4000)
    }

    // Modération: bannissement
    if (d.type === "moderation" && d.action === "member-banned") {
      setState("banning", 4000)
    }

    // Message programmé
    if (d.type === "engagement" && d.action === "scheduled") {
      setState("scheduled", 4000)
    }

    // Notification système
    if (d.type === "notification") {
      const nType = (d.notification_type || "").toLowerCase()
      if (nType.includes("alert") || nType.includes("warning") || nType.includes("expir")) {
        setState("alert", 4000)
      } else if (nType.includes("success") || nType.includes("credit")) {
        setState("happy", 3000)
      }
    }

    // Logs: erreur
    if (d.type === "log") {
      const level = (d.level || "").toLowerCase()
      if (level === "error" || level === "fatal") {
        setState("alert", 3000)
      }
    }
  }, [lastMessage, setState])

  // Timer pour idle - remet en idle après 30s d'inactivité
  useEffect(() => {
    let t: NodeJS.Timeout | null = null
    const resetIdle = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => setState("idle"), 30000)
    }
    window.addEventListener("mousemove", resetIdle)
    window.addEventListener("click", resetIdle)
    resetIdle()
    return () => {
      window.removeEventListener("mousemove", resetIdle)
      window.removeEventListener("click", resetIdle)
      if (t) clearTimeout(t)
    }
  }, [setState])

  return null
}
