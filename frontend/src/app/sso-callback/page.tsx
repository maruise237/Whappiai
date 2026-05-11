"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react"

export default function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback 
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/register?from=google_login&intent=signup"
    />
  )
}
