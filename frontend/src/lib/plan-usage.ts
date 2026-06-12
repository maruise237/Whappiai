"use client"

import { api } from "@/lib/api"
import { getPlanCode, getPlanLabel } from "@/components/dashboard/plan-badge"
import { ensureString } from "@/lib/utils"

type SessionItem = {
  sessionId?: string
  isConnected?: boolean
  status?: string
  [key: string]: unknown
}

type GroupItem = {
  id?: string
  jid?: string
  settings?: Record<string, unknown> | null
  [key: string]: unknown
}

export function getPlanGroupLimit(plan: string) {
  const limits: Record<string, number> = {
    trial: 1,
    starter: 3,
    pro: 6,
    business: 16,
  }
  return limits[getPlanCode(plan)] ?? 1
}

export function isManagedGroupSettings(settings?: Record<string, unknown> | null) {
  const forbiddenWords = ensureString(settings?.forbiddenWords ?? settings?.bad_words ?? settings?.banned_words, "").trim()
  return Boolean(
    settings?.antiLinksEnabled ??
    settings?.anti_link ??
    settings?.anti_links_enabled ??
    settings?.welcomeEnabled ??
    settings?.welcome_enabled ??
    settings?.welcome_digest_enabled ??
    settings?.warningsEnabled ??
    settings?.warnings_enabled ??
    settings?.exclusionEnabled ??
    settings?.auto_kick_enabled ??
    forbiddenWords
  )
}

export async function getManagedGroupUsage(token?: string) {
  const sessions = await api.sessions.list(token)
  const connectedSessions = (Array.isArray(sessions) ? sessions : []).filter(
    (session: SessionItem) => session.isConnected || session.status === "CONNECTED"
  )

  const results = await Promise.allSettled(
    connectedSessions.map(async (session: SessionItem) => {
      const sessionId = ensureString(session.sessionId)
      if (!sessionId) return 0

      const groups = await api.sessions.getGroups(sessionId, token)
      const groupList = Array.isArray(groups) ? groups : []
      const counts = await Promise.allSettled(
        groupList.map(async (group: GroupItem) => {
          const groupId = ensureString(group.id || group.jid)
          if (!groupId) return false

          try {
            const settings = await api.sessions.getGroupSettings(sessionId, groupId, token)
            return isManagedGroupSettings(settings)
          } catch {
            return isManagedGroupSettings(group.settings || null)
          }
        })
      )

      return counts.filter(result => result.status === "fulfilled" && result.value).length
    })
  )

  return results.reduce((total, result) => (
    result.status === "fulfilled" ? total + result.value : total
  ), 0)
}

export function getPlanUsageMessage(plan: string, used: number) {
  const label = getPlanLabel(plan)
  const limit = getPlanGroupLimit(plan)
  const remaining = Math.max(limit - used, 0)

  if (remaining <= 0) {
    return `Votre plan ${label} a atteint sa limite de ${limit} groupe(s) proteges.`
  }

  if (remaining === 1) {
    return `Il vous reste 1 groupe a proteger sur votre plan ${label}.`
  }

  return `Il vous reste ${remaining} groupes a proteger sur votre plan ${label}.`
}
