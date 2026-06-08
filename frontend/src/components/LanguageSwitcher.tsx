"use client"

import { useTranslation } from "react-i18next"

const FlagFR = () => (
  <svg className="inline-block h-3.5 w-5 rounded-sm" viewBox="0 0 3 2">
    <rect width="3" height="2" fill="#ED2939" />
    <rect width="2" height="2" fill="#fff" />
    <rect width="1" height="2" fill="#002395" />
  </svg>
)

const FlagGB = () => (
  <svg className="inline-block h-3.5 w-5 rounded-sm" viewBox="0 0 3 2">
    <rect width="3" height="2" fill="#012169" />
    <rect width="3" height="0.4" y="0.8" fill="#fff" />
    <rect width="0.4" height="2" x="1.3" fill="#fff" />
    <rect width="3" height="0.2" y="0.9" fill="#C8102E" />
    <rect width="0.2" height="2" x="1.4" fill="#C8102E" />
  </svg>
)

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
        <><FlagGB /> EN</>
      ) : (
        <><FlagFR /> FR</>
      )}
    </button>
  )
}
