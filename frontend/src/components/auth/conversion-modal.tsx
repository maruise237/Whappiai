"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser, useSignUp } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Shield, Lock, ArrowRight, Loader2 } from "lucide-react"

export function ConversionModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { signUp, isLoaded } = useSignUp()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const from = searchParams.get("from")
    const intent = searchParams.get("intent")
    
    if (from === "google_login" && intent === "signup") {
      setIsOpen(true)
      // Tracking placeholder
      console.log("View conversion modal", { from, intent })
    }
  }, [searchParams])

  const handleCreateAccount = async () => {
    setLoading(true)
    // Tracking placeholder
    console.log("Click create account from modal")
    
    // Si l'utilisateur est déjà connecté (créé automatiquement par le callback), on redirige vers le dashboard
    if (isSignedIn && user) {
      router.push("/dashboard")
      return
    }

    // Sinon, on relance le processus d'inscription Google
    if (!isLoaded) return

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err) {
      console.error("Signup error:", err)
      setLoading(false)
    }
  }

  const handleLoginRedirect = () => {
    router.push("/login")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-green-500/10 via-background to-background p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Bienvenue ! 👋
            </DialogTitle>
            <DialogDescription className="text-center text-base sm:text-lg text-foreground/80">
              Vous êtes à quelques secondes de rejoindre notre communauté.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">
                Nous avons détecté que vous n'avez pas encore de compte.
              </p>
              <p>
                L'inscription est gratuite et prend moins de 30 secondes.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Personnalisation avancée de votre expérience",
                "Sauvegarde sécurisée de vos données",
                "Accès aux fonctionnalités premium",
                "Support prioritaire 24/7"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button 
                size="lg" 
                className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-[1.02]"
                onClick={handleCreateAccount}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Créer mon compte gratuitement
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleLoginRedirect}
              >
                J'ai déjà un compte
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>100% Sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Données chiffrées</span>
            </div>
          </div>
          <a href="/privacy" className="hover:underline hover:text-foreground transition-colors">
            Politique de confidentialité
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
