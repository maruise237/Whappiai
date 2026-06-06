/**
 * Helpers for displaying user identities safely in admin UI.
 *
 * Clerk IDs look like `user_3d98q56xodbgg1fbjzedmt1ocia` — never show those
 * as the primary label. Some accounts also use Apple Private Relay which
 * masks real email addresses.
 */

export type UserLike = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  id?: string | null
  clerkId?: string | null
}

export function getUserDisplayName(user: UserLike): { name: string; email: string; isAnonymous: boolean } {
  const isAppleRelay = !!user.email && user.email.includes('privaterelay.appleid.com')

  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user.firstName || user.lastName || null

  // Clerk IDs look like "user_abc123..." or "clerk_..." or "USER_..." with no "@"
  const emailLooksLikeClerkId = !!user.email && /^(user_|clerk_|USER_|user_)/.test(user.email) && !user.email.includes('@')
  const idLooksLikeClerkId = !!user.id && /^(user_|clerk_|USER_)/.test(user.id)
  const clerkIdLooksLikeId = !!user.clerkId && /^(user_|clerk_|USER_)/.test(user.clerkId)

  let name: string
  if (fullName) {
    name = fullName
  } else if (isAppleRelay) {
    name = 'Utilisateur Apple'
  } else if (user.email && user.email.includes('@') && !emailLooksLikeClerkId) {
    name = user.email.split('@')[0]
  } else if (idLooksLikeId && user.id) {
    // Use first 6 chars of the ID for a stable, human-ish label
    const short = user.id.replace(/^(user_|clerk_|USER_)/, '').slice(0, 6)
    name = `Utilisateur ${short}`
  } else if (clerkIdLooksLikeId && user.clerkId) {
    const short = user.clerkId!.replace(/^(user_|clerk_|USER_)/, '').slice(0, 6)
    name = `Utilisateur ${short}`
  } else {
    name = 'Utilisateur'
  }

  return {
    name,
    email: isAppleRelay
      ? 'Email masqué (Apple Sign In)'
      : (user.email && user.email.includes('@') ? user.email : '—'),
    isAnonymous: isAppleRelay || !user.email || emailLooksLikeClerkId,
  }
}

export function isSystemAccount(user: { email?: string | null }): boolean {
  if (!user.email) return true
  return /localhost|test\.local|admin@|noreply@|seed|example\.com/i.test(user.email)
}

export function isClerkIdLike(value?: string | null): boolean {
  return !!value && /^(user_|clerk_|USER_)/.test(value) && !value.includes('@')
}
