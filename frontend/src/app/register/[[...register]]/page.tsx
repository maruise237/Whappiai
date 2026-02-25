"use client"

import { useState, useEffect } from "react"
import { useSignUp, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { InstallPrompt } from "@/components/InstallPrompt"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import Link from "next/link"
import { Eye, EyeOff, Loader2, ArrowLeft, Mail } from "lucide-react"

import { ConversionModal } from "@/components/auth/conversion-modal"

export default function RegisterPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { user, isSignedIn } = useUser()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Redirection automatique une fois l'utilisateur authentifié
  useEffect(() => {
    if (isSignedIn && user) {
      // Si on vient du flux de conversion, on laisse la modale gérer la redirection
      const params = new URLSearchParams(window.location.search)
      if (params.get("intent") === "signup" || params.get("conversion") === "true") {
        return
      }
      router.push("/dashboard")
    }
  }, [isSignedIn, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError("")

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setVerifying(true)
    } catch (err: any) {
      console.error("Register error:", err)
      setError(err.errors?.[0]?.longMessage || "Une erreur est survenue lors de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError("")

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId })
        // Redirection immédiate sans attendre le useEffect
        router.push("/dashboard")
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2))
        setError("Code de vérification invalide.")
        setLoading(false)
      }
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(err.errors?.[0]?.longMessage || "Code invalide.")
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <AuthLayout title="Vérification" subtitle="Entrez le code reçu par email">
        <form onSubmit={handleVerify} className="space-y-6 flex flex-col items-center">
          <div className="text-center text-sm text-muted-foreground mb-2">
            Un code a été envoyé à <span className="text-foreground font-medium">{email}</span>
          </div>
          
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
              <InputOTPSlot index={1} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
              <InputOTPSlot index={2} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
              <InputOTPSlot index={3} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
              <InputOTPSlot index={4} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
              <InputOTPSlot index={5} className="w-10 h-12 text-lg bg-background border-input text-foreground" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl bg-background border-input text-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setVerifying(false)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button 
              type="submit" 
              className="flex-[2] h-12 bg-primary text-primary-foreground font-bold text-[15px] rounded-xl shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Vérifier"}
            </Button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  return (
    <>
      <AuthLayout title="Créer un compte" subtitle="Commencez votre essai gratuit">
        <ConversionModal />
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button 
            type="submit" 
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-[15px] relative overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] rounded-xl shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            disabled={loading}
          >
            <div className="absolute left-4">
              <Mail className="w-5 h-5" />
            </div>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continuer avec Email"}
          </Button>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input 
                  id="firstName"
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Prénom"
                  className="h-12 bg-background border-input focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Input 
                  id="lastName"
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Nom"
                  className="h-12 bg-background border-input focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Input 
                id="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Entrez votre email"
                className="h-12 bg-background border-input focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
                required
              />
            </div>

            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Créez un mot de passe" 
                className="h-12 bg-background border-input focus:border-primary text-foreground pr-10 placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
            <span className="bg-background px-3 text-muted-foreground">ou s'inscrire avec</span>
          </div>
        </div>

        <SocialButtons mode="signup" />

        <div className="mt-8 pt-6 border-t border-dashed border-border/60 text-center text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-semibold transition-colors hover:underline">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
      <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
    </>
  )
}
