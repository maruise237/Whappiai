"use client"

import { useEffect } from "react"
import { useWappy } from "@/providers/wappy-provider"
import { useWebSocket } from "@/providers/websocket-provider"
import { WAPPY_EVENT_NAME, type WappyEventPayload } from "@/lib/wappy-events"

export function WappyConnector() {
  const { setState } = useWappy()
  const { lastMessage } = useWebSocket()

  const handleWappyPayload = (d: WappyEventPayload | any) => {
    if (!d) return

    if (d.type === "session-update") {
      const data = Array.isArray(d.data) ? d.data : [d.data]
      for (const update of data) {
        const status = (update?.status || "").toLowerCase()
        if (status === "connected" || status === "open") {
          setState("happy", 4000)
        } else if (status === "disconnected" || status === "close") {
          setState("sad", 5000)
        } else if (status === "connecting") {
          setState("working", 3000)
        }
      }
      return
    }

    if (d.type === "session") {
      const status = String(d.status || "").toLowerCase()
      if (status === "connected") {
        setState("happy", 4000)
      } else if (status === "disconnected") {
        setState("sad", 5000)
      } else if (status === "connecting") {
        setState("working", 3000)
      } else if (d.action === "deleted") {
        setState("sad", 3500)
      } else if (d.action === "copied" || d.action === "pairing-copied") {
        setState("happy", 1800)
      } else if (d.action === "pairing-requested" || d.action === "qr-requested" || d.action === "created") {
        setState("working", 2500)
      }
      return
    }

    if (d.type === "moderation") {
      switch (d.action) {
        case "link-blocked":
        case "member-warned":
        case "limit-reached":
          setState("alert", 3500)
          break
        case "member-banned":
          setState("banning", 4000)
          break
        case "warnings-reset":
        case "rule-updated":
          setState("happy", 2200)
          break
        case "member-joined":
          setState("happy", 3000)
          break
        case "member-left":
        case "task-deleted":
          setState("sad", 2500)
          break
        case "task-created":
        case "welcome-scheduled":
          setState("scheduled", 3500)
          break
      }
      return
    }

    if (d.type === "messaging" && d.action === "incoming") {
      setState("thinking", 2000)
      return
    }

    if (d.type === "engagement") {
      switch (d.action) {
        case "scheduled":
        case "welcome-scheduled":
          setState("scheduled", 4000)
          break
        case "sent":
          setState("happy", 3000)
          break
        case "task-created":
          setState("working", 2500)
          break
        case "task-deleted":
          setState("sad", 2000)
          break
      }
      return
    }

    if (d.type === "ai" && d.action === "message-sent") {
      setState("working", 2500)
      return
    }

    if (d.type === "credits" && d.action === "changed") {
      const amount = Number(d.amount || 0)
      setState(amount > 0 ? "happy" : "sad", 3000)
      return
    }

    if (d.type === "billing") {
      if (d.action === "plan-changed" || d.action === "checkout-started") {
        setState("happy", 3500)
      } else if (d.action === "checkout-failed") {
        setState("alert", 3500)
      }
      return
    }

    if (d.type === "profile") {
      if (d.action === "saved" || d.action === "preferences-saved") {
        setState("happy", 2500)
      } else if (d.action === "signout") {
        setState("waving", 2200)
      }
      return
    }

    if (d.type === "system" && d.action === "error") {
      setState("alert", 4000)
      return
    }

    if (d.type === "notification") {
      const notificationType = String(d.notification_type || "").toLowerCase()
      if (notificationType.includes("alert") || notificationType.includes("warning") || notificationType.includes("expir")) {
        setState("alert", 4000)
      } else if (notificationType.includes("success") || notificationType.includes("credit")) {
        setState("happy", 3000)
      }
      return
    }

    if (d.type === "log") {
      const level = String(d.level || "").toLowerCase()
      if (level === "error" || level === "fatal") {
        setState("alert", 3000)
      }
    }
  }

  useEffect(() => {
    if (!lastMessage) return
    handleWappyPayload(lastMessage)
  }, [lastMessage])

  useEffect(() => {
    const onEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WappyEventPayload>
      handleWappyPayload(customEvent.detail)
    }

    window.addEventListener(WAPPY_EVENT_NAME, onEvent as EventListener)
    return () => {
      window.removeEventListener(WAPPY_EVENT_NAME, onEvent as EventListener)
    }
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null
    const resetIdle = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => setState("idle"), 30000)
    }
    window.addEventListener("mousemove", resetIdle)
    window.addEventListener("click", resetIdle)
    resetIdle()
    return () => {
      window.removeEventListener("mousemove", resetIdle)
      window.removeEventListener("click", resetIdle)
      if (timeout) clearTimeout(timeout)
    }
  }, [setState])

  return null
}
