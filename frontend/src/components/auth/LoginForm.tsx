"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
const ICON_SIZE_SMALL = 18;
import { Loader2, Mail, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Button
        type="submit"
        className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-[15px]
          relative overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
          rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
        disabled={loading}
      >
        <div className="absolute left-4">
          <Mail className="w-5 h-5" />
        </div>
        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter avec Email"}
      </Button>

      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Entrez votre email"
            className="h-12 bg-background border-input focus:border-green-500 text-foreground
              placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
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
            className="h-12 bg-background border-input focus:border-green-500 text-foreground
              pr-10 placeholder:text-muted-foreground/60 rounded-xl transition-colors shadow-sm"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={ICON_SIZE_SMALL} /> : <Eye size={ICON_SIZE_SMALL} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50
          dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/20">
          {error}
        </div>
      )}
    </form>
  )
}
