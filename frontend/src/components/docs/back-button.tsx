"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function DocsBackButton() {
  const { isSignedIn, isLoaded } = useUser()
  const [mounted, setMounted] = useState(false)

  // Éviter l'hydratation incorrecte
  useEffect(() => {
    setMounted(true)
  }, [])

  // Par défaut (pendant le chargement ou SSR), on renvoie vers la home pour éviter des sauts
  // Mais idéalement on attend isLoaded. Si on veut être safe, on peut mettre "/" par défaut.
  const href = isLoaded && isSignedIn ? "/dashboard" : "/"

  if (!mounted) return null

  return (
    <div className="fixed top-6 left-6 z-50 animate-in fade-in duration-300">
      <Button
        variant="secondary"
        size="sm"
        className="backdrop-blur-md bg-background/50 hover:bg-background/80 border border-border shadow-sm transition-all duration-200"
        asChild
      >
        <Link href={href} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </Link>
      </Button>
    </div>
  )
}
