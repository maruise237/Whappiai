"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { InstallPrompt } from "@/components/InstallPrompt"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Mail } from "lucide-react"

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

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
        router.push("/dashboard")
      } else {
        console.log(result)
        setError("Une erreur est survenue. Veuillez vérifier vos identifiants.")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.errors?.[0]?.longMessage || "Identifiants invalides.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthLayout title="Connexion" subtitle="Connectez-vous ou créez un compte automatiquement">
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button 
            type="submit" 
            className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-[15px] relative overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
            disabled={loading}
          >
            <div className="absolute left-4">
              <Mail className="w-5 h-5" />
            </div>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continuer avec Email"}
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
                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-green-500 text-white placeholder:text-zinc-500 rounded-xl transition-colors"
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
                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-green-500 text-white pr-10 placeholder:text-zinc-500 rounded-xl transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-green-400 transition-colors">
                Mot de passe oublié ?
              </Link>
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
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
            <span className="bg-[#0a0a0a] px-3 text-zinc-500">ou</span>
          </div>
        </div>

        <SocialButtons mode="signin" />

        <div className="mt-6 text-center text-sm text-zinc-500">
          Vous n'avez pas de compte ?{" "}
          <Link href="/register" className="text-green-500 hover:text-green-400 font-semibold transition-colors hover:underline">
            S'inscrire
          </Link>
        </div>
      </AuthLayout>
    </>
  )
}
