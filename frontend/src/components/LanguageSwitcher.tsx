"use client"

import { useI18n } from "@/i18n/i18n-provider"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <button
      onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-muted hover:text-foreground"
      title={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      {locale === "fr" ? "EN" : "FR"}
    </button>
  )
}
