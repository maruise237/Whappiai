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
              <InputOTPSlot index={0} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
              <InputOTPSlot index={1} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
              <InputOTPSlot index={2} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
              <InputOTPSlot index={3} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
              <InputOTPSlot index={4} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
              <InputOTPSlot index={5} className="w-10 h-12 text-lg bg-zinc-900/50 border-zinc-800 text-white" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => setVerifying(false)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button 
              type="submit" 
              className="flex-[2] h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-[15px] rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
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

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input 
                  id="firstName"
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Prénom"
                  className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-green-500 text-white placeholder:text-zinc-500 rounded-xl transition-colors"
                  required
                />
              </div>
              <div className="space-y-1">
                <Input 
                  id="lastName"
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Nom"
                  className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-green-500 text-white placeholder:text-zinc-500 rounded-xl transition-colors"
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
                placeholder="Créez un mot de passe" 
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

        <SocialButtons mode="signup" />

        <div className="mt-6 text-center text-sm text-zinc-500">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-green-500 hover:text-green-400 font-semibold transition-colors hover:underline">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
      <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
    </>
  )
}
