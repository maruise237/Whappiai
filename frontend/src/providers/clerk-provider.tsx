"use client"

import { ClerkProvider } from "@clerk/clerk-react"
import { frFR } from "@clerk/localizations"
import { useRouter } from "next/navigation"

export function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    console.warn("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey || ""}
      localization={frFR}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  )
}
