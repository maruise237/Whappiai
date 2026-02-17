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
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Button 
        variant="outline" 
        onClick={handleGoogleClick}
        className="h-11 bg-background text-foreground hover:bg-muted border-input font-semibold text-xs"
      >
        <Chrome className="mr-2 h-4 w-4" />
        Google
      </Button>
      <Button 
        variant="outline" 
        disabled
        className="h-11 bg-background text-foreground border-input hover:bg-muted font-semibold text-xs opacity-50 cursor-not-allowed"
      >
        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.39-1.09-.52-2.09-.48-3.24.02-1.44.62-2.2.44-3.06-.43C4.55 17.16 3.68 13.04 6.9 11.55c1.54-.71 2.8-.56 3.69-.02.8.48 1.62.66 2.52-.08.64-.52 1.5-.7 2.44-.22 2.7.97 3.28 3.17 3.32 3.25-.04.02-2 .77-2.38 3.14-.37 2.27 1.76 3.25 1.8 3.28-.56 1.73-1.42 2.68-2.34 3.79-.58.69-1.13 1.4-1.9 1.59zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
        Apple
      </Button>
    </div>
  )
}
