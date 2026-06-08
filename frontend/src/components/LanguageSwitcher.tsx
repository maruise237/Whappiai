"use client"

import { useTranslation } from "react-i18next"

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith("en") ? "en" : "fr"

  const toggle = () => {
    const next = current === "fr" ? "en" : "fr"
    i18n.changeLanguage(next)
    localStorage.setItem("whappi_locale", next)
  }

  return (
    <button
      onClick={toggle}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold tracking-wider text-muted-foreground transition hover:bg-muted hover:text-foreground"
      title={current === "fr" ? "Switch to English" : "Passer en français"}
    >
      {current === "fr" ? (
        <><span className="text-base leading-none">🇬🇧</span> EN</>
      ) : (
        <><span className="text-base leading-none">🇫🇷</span> FR</>
      )}
    </button>
  )
}
