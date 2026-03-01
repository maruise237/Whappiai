"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { LoginForm } from "@/components/auth/LoginForm"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"

const ICON_SIZE_SMALL = 18;
export default function LoginPage() {
  const { user, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isSignedIn && user) {
      router.push("/dashboard")
    }
  }, [isSignedIn, user, router])

  return (
    <AuthLayout title="Bon retour parmi nous" subtitle="Accédez à votre espace de travail">
      <LoginForm />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
          <span className="bg-background px-3 text-muted-foreground">ou continuer avec</span>
        </div>
      </div>

      <SocialButtons mode="signin" />

      <div className="mt-8 pt-6 border-t border-dashed border-border/60">
        <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl p-5
          border border-green-500/10 hover:border-green-500/20 transition-colors group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400
              mt-0.5 group-hover:scale-110 transition-transform duration-300">
              <Sparkles size={ICON_SIZE_SMALL} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">Pas encore de compte ?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rejoignez les entreprises qui automatisent leur support client. Essai gratuit sans carte bancaire.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4 h-10 border border-green-500/20 hover:border-green-500/40
              hover:bg-green-500/10 text-green-700 dark:text-green-300 transition-all text-xs
              uppercase tracking-wide font-bold flex items-center justify-between px-4 group/btn"
            onClick={() => router.push("/register")}
          >
            <span>Commencer l&apos;inscription</span>
            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
