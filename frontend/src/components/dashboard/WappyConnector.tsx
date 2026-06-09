"use client"

import { useEffect } from "react"
import { useWappy } from "@/providers/wappy-provider"
import { useWebSocket } from "@/providers/websocket-provider"

/**
 * WappyConnector - pont entre les événements de l'app et l'état de Wappy
 * Écoute les WebSocket et les events DOM pour animer la mascotte
 *
 * Carte complète des événements connectés :
 *   type           | action             | animation       | source
 *   ───────────────|────────────────────|─────────────────|─────────────────────
 *   session-update | connected          | happy           | EvolutionWebhook
 *   session-update | disconnected       | sad             | EvolutionWebhook
 *   session-update | connecting         | working         | EvolutionWebhook
 *   session        | connected          | happy           | WappyBroadcaster
 *   session        | disconnected       | sad             | WappyBroadcaster
 *   session        | connecting         | working         | WappyBroadcaster
 *   session        | deleted            | sad             | WappyBroadcaster
 *   moderation     | link-blocked       | alert           | WappyBroadcaster
 *   moderation     | member-warned      | alert           | WappyBroadcaster
 *   moderation     | member-banned      | banning         | WappyBroadcaster
 *   moderation     | warnings-reset     | happy           | WappyBroadcaster
 *   moderation     | rule-updated       | happy           | WappyBroadcaster
 *   moderation     | member-joined      | happy           | WappyBroadcaster
 *   moderation     | member-left        | sad             | WappyBroadcaster
 *   messaging      | incoming           | thinking        | WappyBroadcaster
 *   engagement     | scheduled          | scheduled       | WappyBroadcaster
 *   engagement     | sent               | happy           | WappyBroadcaster
 *   engagement     | task-created       | working         | WappyBroadcaster
 *   engagement     | task-deleted       | sad             | WappyBroadcaster
 *   ai             | message-sent       | working         | WappyBroadcaster
 *   credits        | changed (>0)       | happy           | WappyBroadcaster
 *   credits        | changed (<0)       | sad             | WappyBroadcaster
 *   billing        | plan-changed       | happy           | WappyBroadcaster
 *   system         | error              | alert           | WappyBroadcaster
 *   log            | level=error/fatal  | alert           | serveur
 *   notification   | alert/warning      | alert           | serveur
 *   notification   | success/credit     | happy           | serveur
 */
export function WappyConnector() {
  const { setState } = useWappy()
  const { lastMessage } = useWebSocket()

  // Écouter les messages WebSocket
  useEffect(() => {
    if (!lastMessage) return

    const d = lastMessage

    // ── Session ──────────────────────────────────────────────
    // 1) broadcastSessionUpdate() envoie { type, data: { status, ... } }
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
      return // évite double-réaction avec le bloc session ci-dessous
    }

    // 2) WappyEventBroadcaster envoie { type, action, status, ... }
    if (d.type === "session") {
      const s = (d.status || "").toLowerCase()
      if (s === "connected") {
        setState("happy", 4000)
      } else if (s === "disconnected") {
        setState("sad", 5000)
      } else if (s === "connecting") {
        setState("working", 3000)
      } else if (d.action === "deleted") {
        setState("sad", 3500)
      }
      return
    }

    // ── Modération ───────────────────────────────────────────
    if (d.type === "moderation") {
      switch (d.action) {
        case "link-blocked":   setState("alert", 4000); break
        case "member-warned":  setState("alert", 3000); break
        case "member-banned":  setState("banning", 4000); break
        case "warnings-reset": setState("happy", 3000); break
        case "rule-updated":   setState("happy", 2000); break
        case "member-joined":  setState("happy", 3000); break
        case "member-left":    setState("sad", 3000); break
      }
      return
    }

    // ── Messaging ────────────────────────────────────────────
    if (d.type === "messaging" && d.action === "incoming") {
      setState("thinking", 2000)
      return
    }

    // ── Engagement ───────────────────────────────────────────
    if (d.type === "engagement") {
      switch (d.action) {
        case "scheduled":    setState("scheduled", 4000); break
        case "sent":         setState("happy", 3000); break
        case "task-created": setState("working", 2500); break
        case "task-deleted": setState("sad", 2000); break
      }
      return
    }

    // ── IA ───────────────────────────────────────────────────
    if (d.type === "ai" && d.action === "message-sent") {
      setState("working", 2500)
      return
    }

    // ── Crédits ──────────────────────────────────────────────
    if (d.type === "credits" && d.action === "changed") {
      const amount = d.amount || 0
      setState(amount > 0 ? "happy" : "sad", 3000)
      return
    }

    // ── Billing / Plan ───────────────────────────────────────
    if (d.type === "billing" && d.action === "plan-changed") {
      setState("happy", 3500)
      return
    }

    // ── Système / Erreur ─────────────────────────────────────
    if (d.type === "system" && d.action === "error") {
      setState("alert", 4000)
      return
    }

    // ── Notification ─────────────────────────────────────────
    if (d.type === "notification") {
      const nType = (d.notification_type || "").toLowerCase()
      if (nType.includes("alert") || nType.includes("warning") || nType.includes("expir")) {
        setState("alert", 4000)
      } else if (nType.includes("success") || nType.includes("credit")) {
        setState("happy", 3000)
      }
      return
    }

    // ── Logs ─────────────────────────────────────────────────
    if (d.type === "log") {
      const level = (d.level || "").toLowerCase()
      if (level === "error" || level === "fatal") {
        setState("alert", 3000)
      }
      return
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
