"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export default function AiRedirectPage() {
  const router = useRouter()
  React.useEffect(() => { router.replace("/dashboard/ai-models") }, [router])
  return null
}
