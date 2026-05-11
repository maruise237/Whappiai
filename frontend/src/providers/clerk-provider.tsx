"use client"

import { ClerkProvider } from "@clerk/clerk-react"
import { frFR } from "@clerk/localizations"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  useEffect(() => {
    setMounted(true)
  }, [])

  // If we don't have a publishableKey, we can't initialize Clerk.
  // During build (static export), if NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set,
  // we must avoid rendering ClerkProvider.
  // However, child components might use useUser() and crash.
  // The solution is to ensure the build environment has a valid-looking (but doesn't have to be active) key
  // or to make child components resilient.

  if (!publishableKey) {
    if (typeof window !== 'undefined') {
       console.warn("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
    }
    return <>{children}</>
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={frFR}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  )
}
