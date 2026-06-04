"use client"

import { ClerkProvider } from "@clerk/clerk-react"
import { frFR } from "@clerk/localizations"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder"

  useEffect(() => {
    setMounted(true)
  }, [])

  // During build (static export) or SSR, mounted is false.
  // We still MUST wrap with ClerkProvider to avoid "useUser can only be used within <ClerkProvider />" errors
  // in child components that are being prerendered.
  // Using a placeholder key during build allows the prerendering to succeed.

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
