"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { InstallPrompt } from "@/components/InstallPrompt"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { ConversionModal } from "@/components/auth/conversion-modal"
import Link from "next/link"

const ICON_SIZE_SMALL = 18;
export default function RegisterPage() {
  const { user, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isSignedIn && user) {
      const params = new URLSearchParams(window.location.search)
      if (params.get("intent") === "signup" || params.get("conversion") === "true") {
        return
      }
      router.push("/dashboard")
    }
  }, [isSignedIn, user, router])

  return (
    <>
      <AuthLayout title="Créer un compte" subtitle="Commencez votre essai gratuit">
        <ConversionModal />
        <RegisterForm />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
            <span className="bg-background px-3 text-muted-foreground">ou s&apos;inscrire avec</span>
          </div>
        </div>

        <SocialButtons mode="signup" />

        <div className="mt-8 pt-6 border-t border-dashed border-border/60 text-center text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-green-600 dark:text-green-500 hover:text-green-500
            dark:hover:text-green-400 font-semibold transition-colors hover:underline">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
      <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
    </>
  )
}
