"use client"

import * as React from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "./config"

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (i18n.isInitialized) {
      setReady(true)
    } else {
      i18n.on("initialized", () => setReady(true))
    }
  }, [])

  if (!ready) return <>{children}</> // fall back to FR while loading

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
