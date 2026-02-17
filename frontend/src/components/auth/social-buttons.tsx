"use client"

import { Button } from "@/components/ui/button"
import { useSignIn } from "@clerk/nextjs"
import { Chrome } from "lucide-react"

export function SocialButtons({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const { signIn, isLoaded } = useSignIn()

  if (!isLoaded) return null

  const handleGoogleClick = () => {
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard",
    })
  }

  // Note: For real Apple implementation, you need Apple strategy enabled in Clerk dashboard
  const handleAppleClick = () => {
     // Placeholder for Apple Auth
     console.log("Apple Auth not configured in demo")
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button 
        variant="outline" 
        onClick={handleGoogleClick}
        className="w-full h-12 bg-white hover:bg-zinc-100 text-black border-transparent font-semibold text-[15px] relative overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] rounded-xl"
      >
        <div className="absolute left-4">
           <Chrome className="w-5 h-5" />
        </div>
        Continuer avec Google
      </Button>
      
      {/* Example for Facebook (Disabled state kept for now, but styled to match) */}
      <Button 
        variant="outline" 
        disabled
        className="w-full h-12 bg-[#1877F2] text-white border-transparent hover:bg-[#1864cc] font-semibold text-[15px] relative overflow-hidden transition-all duration-200 rounded-xl opacity-50 cursor-not-allowed"
      >
        <div className="absolute left-4">
           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </div>
        Continuer avec Facebook
      </Button>
    </div>
  )
}
