export function getAdminErrorMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : String(error || "")
  const normalized = raw.trim()

  if (!normalized) return fallback

  if (
    normalized.includes("Too many authentication attempts") ||
    normalized.includes("Admin rate limit exceeded") ||
    normalized.includes("API rate limit exceeded")
  ) {
    return "Trop de requetes ont ete envoyees en peu de temps. Reessayez dans quelques secondes."
  }

  if (normalized.includes("Failed to fetch") || normalized.includes("NetworkError")) {
    return "La connexion a l'administration a echoue. Verifiez le redeploiement ou reessayez."
  }

  if (normalized.includes("{\"status\"")) {
    try {
      const parsed = JSON.parse(normalized)
      if (parsed?.message) return String(parsed.message)
    } catch {
      return fallback
    }
  }

  return normalized
}
