"use client"

import { useState, useEffect } from "react"
import { useSignIn, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { InstallPrompt } from "@/components/InstallPrompt"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Mail, Sparkles, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { user, isSignedIn } = useUser()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Redirection automatique une fois l'utilisateur authentifié
  useEffect(() => {
    if (isSignedIn && user) {
      router.push("/dashboard")
    }
  }, [isSignedIn, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError("")

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        // Redirection immédiate sans attendre le useEffect
        router.push("/dashboard")
      } else {
        console.log(result)
        setError("Une erreur est survenue. Veuillez vérifier vos identifiants.")
        setLoading(false)
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.errors?.[0]?.longMessage || "Identifiants invalides.")
      setLoading(false)
    }
  }

  return (
    <>
      <AuthLayout title="Bon retour parmi nous" subtitle="Accédez à votre espace de travail">
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button 
            type="submit" 
            className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-[15px] relative overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
            disabled={loading}
          >
            <div className="absolute left-4">
              <Mail className="w-5 h-5" />
            </div>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter avec Email"}
          </Button>

          {/* Email/Password Fields - Visually integrated to look like they expand or belong to the email flow */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Input 
                id="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Entrez votre email"
                className="h-12 bg-background border-input focus:border-green-500 text-foreground placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
                required
              />
            </div>
            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Mot de passe" 
                className="h-12 bg-background border-input focus:border-green-500 text-foreground pr-10 placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
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
            <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
            <span className="bg-background px-3 text-muted-foreground">ou continuer avec</span>
          </div>
        </div>

        <SocialButtons mode="signin" />

        {/* Section Nouveau Compte - SaaS 2026 Best Practice */}
        <div className="mt-8 pt-6 border-t border-dashed border-border/60">
          <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl p-5 border border-green-500/10 hover:border-green-500/20 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                <Sparkles size={18} />
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
              className="w-full mt-4 h-10 border border-green-500/20 hover:border-green-500/40 hover:bg-green-500/10 text-green-700 dark:text-green-300 transition-all text-xs uppercase tracking-wide font-bold flex items-center justify-between px-4 group/btn"
              onClick={() => router.push('/register')}
            >
              <span>Commencer l'inscription</span>
              <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </AuthLayout>
    </>
  )
}
