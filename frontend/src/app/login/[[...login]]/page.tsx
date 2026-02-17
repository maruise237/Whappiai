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
import { Eye, EyeOff, Loader2 } from "lucide-react"

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
      <AuthLayout title="Bienvenue" subtitle="Connectez-vous à votre compte">
        <SocialButtons mode="signin" />
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-zinc-900/40 backdrop-blur-xl px-2 text-zinc-500">ou avec email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Email</Label>
            <Input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="nom@exemple.com"
              className="bg-zinc-950/50 border-zinc-800 focus:border-primary text-white h-11 placeholder:text-zinc-600"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Mot de passe</Label>
              <Link href="/forgot-password" className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">Oublié ?</Link>
            </div>
            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="bg-zinc-950/50 border-zinc-800 focus:border-primary text-white h-11 pr-10 placeholder:text-zinc-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest h-11 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Vous n'avez pas de compte ?{" "}
          <Link href="/register" className="text-primary hover:text-primary/80 font-bold transition-colors">
            S'inscrire
          </Link>
        </div>
      </AuthLayout>
      <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
    </>
  )
}
