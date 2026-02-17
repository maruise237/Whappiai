"use client"

import { useState } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { SocialButtons } from "@/components/auth/social-buttons"
import { InstallPrompt } from "@/components/InstallPrompt"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import Link from "next/link"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
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
        router.push("/dashboard")
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2))
        setError("Code de vérification invalide.")
      }
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(err.errors?.[0]?.longMessage || "Code invalide.")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <AuthLayout title="Vérification" subtitle="Entrez le code reçu par email">
        <form onSubmit={handleVerify} className="space-y-6 flex flex-col items-center">
          <div className="text-center text-sm text-zinc-400 mb-2">
            Un code a été envoyé à <span className="text-white font-medium">{email}</span>
          </div>
          
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
              <InputOTPSlot index={1} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
              <InputOTPSlot index={2} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
              <InputOTPSlot index={3} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
              <InputOTPSlot index={4} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
              <InputOTPSlot index={5} className="w-10 h-12 text-lg bg-zinc-950/50 border-zinc-800 text-white" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 w-full animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest h-11 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
            disabled={loading || code.length < 6}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Vérifier"}
          </Button>
          
          <button 
            type="button" 
            onClick={() => setVerifying(false)}
            className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={12} /> Retour
          </button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <>
      <AuthLayout title="Créer un compte" subtitle="Commencez votre essai gratuit">
        <SocialButtons mode="signup" />
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-zinc-900/40 backdrop-blur-xl px-2 text-zinc-500">ou avec email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Prénom</Label>
              <Input 
                id="firstName"
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="Jean"
                className="bg-zinc-950/50 border-zinc-800 focus:border-primary text-white h-11 placeholder:text-zinc-600"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Nom</Label>
              <Input 
                id="lastName"
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Dupont"
                className="bg-zinc-950/50 border-zinc-800 focus:border-primary text-white h-11 placeholder:text-zinc-600"
                required
              />
            </div>
          </div>

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
            <Label htmlFor="password" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Mot de passe</Label>
            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="bg-zinc-950/50 border-zinc-800 focus:border-primary text-white h-11 pr-10 placeholder:text-zinc-600"
                required
                minLength={8}
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
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continuer"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 font-bold transition-colors">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
      <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
    </>
  )
}
