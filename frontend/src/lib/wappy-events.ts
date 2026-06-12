"use client"

export const WAPPY_EVENT_NAME = "whappi:wappy-event"

export type WappyEventPayload = {
  type: string
  action?: string
  [key: string]: unknown
}

export function emitWappyEvent(payload: WappyEventPayload) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(WAPPY_EVENT_NAME, { detail: payload }))
}
