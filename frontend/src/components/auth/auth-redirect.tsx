"use client"

import { useUser } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export function AuthRedirect() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isSignedIn) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    )
  }

  return null
}
