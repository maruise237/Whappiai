"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser, useSignUp, useAuth } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Shield, Lock, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

export function ConversionModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { signUp, isLoaded } = useSignUp()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const from = searchParams.get("from")
    const intent = searchParams.get("intent")
    const conversion = searchParams.get("conversion")
    
    if ((from === "google_login" && intent === "signup") || conversion === "true") {
      setIsOpen(true)
      // Tracking analytics
      console.log("Conversion Modal Viewed", { 
        source: from || 'direct_conversion',
        email: user?.primaryEmailAddress?.emailAddress 
      })
    }
  }, [searchParams, user])

  const handleCreateAccount = async () => {
    setLoading(true)
    console.log("Conversion Action: Create Account Clicked")
    
    // Case 1: User is already authenticated with Clerk (e.g. Google Login) but missing local account
    if (isSignedIn && user) {
      try {
        const token = await getToken()
        const response = await fetch(`${API_BASE_URL}/api/v1/users/sync`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
             name: user.fullName,
             imageUrl: user.imageUrl
          })
        })

        if (response.ok) {
          toast.success("Compte créé avec succès !")
          // Analytics event: Conversion Success
          console.log("Conversion Success: Account Synced")
          router.push("/dashboard")
          setIsOpen(false)
        } else {
          throw new Error("Failed to create account")
        }
      } catch (err) {
        console.error("Sync error:", err)
        toast.error("Erreur lors de la création du compte. Veuillez réessayer.")
      } finally {
        setLoading(false)
      }
      return
    }

    // Case 2: User is NOT authenticated (should not happen in this specific flow but good fallback)
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

  const handleCancel = () => {
    console.log("Conversion Action: Cancelled")
    // Redirect to login if they cancel the creation process
    router.push("/login")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleCancel()
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 overflow-hidden border-none shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-br from-green-500/10 via-background to-background p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Finalisation de votre compte
            </DialogTitle>
            <DialogDescription className="text-center text-base sm:text-lg text-foreground/80">
              Nous n'avons pas trouvé de compte associé à cette adresse email Google.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground text-center text-lg">
                Créez votre compte en 30 secondes pour accéder à toutes les fonctionnalités.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Accès complet au Dashboard",
                "Configuration de vos assistants IA",
                "Gestion des groupes et modération",
                "Statistiques détaillées"
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
                    Créer mon compte
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleCancel}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>RGPD Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Données sécurisées</span>
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
