"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser, useSignUp, useAuth } from "@clerk/clerk-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Shield, Lock, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

export function ConversionModal() {
  const { t } = useTranslation("auth")
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { signUp, isLoaded } = useSignUp()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const benefits = [
    t("conversion_benefit_1"),
    t("conversion_benefit_2"),
    t("conversion_benefit_3"),
    t("conversion_benefit_4"),
  ]

  useEffect(() => {
    const from = searchParams.get("from")
    const intent = searchParams.get("intent")
    const conversion = searchParams.get("conversion")
    
    if ((from === "google_login" && intent === "signup") || conversion === "true") {
      setIsOpen(true)
      console.log("Conversion Modal Viewed", { 
        source: from || 'direct_conversion',
        email: user?.primaryEmailAddress?.emailAddress 
      })
    }
  }, [searchParams, user])

  const handleCreateAccount = async () => {
    setLoading(true)
    console.log("Conversion Action: Create Account Clicked")
    
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
          toast.success(t("conversion_toast_success"))
          console.log("Conversion Success: Account Synced")
          router.push("/dashboard")
          setIsOpen(false)
        } else {
          throw new Error("Failed to create account")
        }
      } catch (err) {
        console.error("Sync error:", err)
        toast.error(t("conversion_toast_error"))
      } finally {
        setLoading(false)
      }
      return
    }

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
              {t("conversion_title")}
            </DialogTitle>
            <DialogDescription className="text-center text-base sm:text-lg text-foreground/80">
              {t("conversion_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground text-center text-lg">
                {t("conversion_prompt")}
              </p>
            </div>

            <div className="space-y-3">
              {benefits.map((benefit, index) => (
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
                    {t("conversion_create_button")}
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
                {t("conversion_cancel")}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>{t("conversion_rgpd")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{t("conversion_secure")}</span>
            </div>
          </div>
          <a href="/privacy" className="hover:underline hover:text-foreground transition-colors">
            {t("conversion_privacy")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
