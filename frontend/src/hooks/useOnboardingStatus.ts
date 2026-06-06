"use client"
import * as React from "react"

/**
 * useOnboardingStatus — single source of truth for the 4-step activation funnel.
 *
 * Step order is the contract that both the "Parcours de prise en main" widget
 * and the "Prochaine action utile" widget depend on. The hook fetches the
 * raw signal once (sessions) and exposes the four booleans + a loading flag.
 *
 * `hasGroup`, `hasActiveRule` and `hasVerifiedActions` are intentionally left
 * `false` here for now — they will be wired to the real endpoints as the
 * backend stabilises. Callers should treat them as optimistic defaults.
 */
export type OnboardingStatus = {
  hasConnectedSession: boolean
  isInGroup: boolean
  hasActiveRule: boolean
  hasVerifiedActions: boolean
  loading: boolean
}

const INITIAL: OnboardingStatus = {
  hasConnectedSession: false,
  isInGroup: false,
  hasActiveRule: false,
  hasVerifiedActions: false,
  loading: true,
}

export function useOnboardingStatus(): OnboardingStatus {
  const [state, setState] = React.useState<OnboardingStatus>(INITIAL)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // We deliberately do NOT use the apiFetch from /lib/api here because
        // dashboard already calls it in a parent effect; we only need a
        // lightweight "do we have any connected session" signal.
        const res = await fetch("/api/v1/sessions", { credentials: "include" })
        const sessions = res.ok ? await res.json() : []
        const list = Array.isArray(sessions)
          ? sessions
          : Array.isArray((sessions as any)?.data)
          ? (sessions as any).data
          : []
        const connected = list.some((s: any) =>
          s?.status === "connected" ||
          s?.status === "ready" ||
          s?.status === "open" ||
          s?.status === "CONNECTED" ||
          s?.isConnected === true
        )
        if (!cancelled) {
          setState({
            hasConnectedSession: connected,
            isInGroup: false,
            hasActiveRule: false,
            hasVerifiedActions: false,
            loading: false,
          })
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/**
 * Canonical step list shared by both widgets. Order is the API.
 * The `key` is used for React keys; `title` and `description` are user-facing.
 */
export const ONBOARDING_STEPS = [
  {
    key: "session",
    title: "Connecter une session",
    description: "QR code ou code d'appairage",
  },
  {
    key: "group",
    title: "Ajouter au groupe",
    description: "Le numero doit etre admin",
  },
  {
    key: "rule",
    title: "Activer une regle",
    description: "Anti-liens ou bienvenue",
  },
  {
    key: "verify",
    title: "Verifier les actions",
    description: "Voir ce qui a ete applique",
  },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]
