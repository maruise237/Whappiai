"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LegacyGroupModerationPage() {
  const router = useRouter()

  React.useEffect(() => {
    router.replace("/dashboard/moderation")
  }, [router])

  return (
    <div className="grid min-h-[60dvh] place-items-center text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin opacity-40" />
    </div>
  )
}
