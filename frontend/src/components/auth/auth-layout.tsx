"use client"

import { useTranslation, Trans } from "react-i18next"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useTranslation("auth")

  const setupSteps = [
    t("setup_step_1"),
    t("setup_step_2"),
    t("setup_step_3"),
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden font-sans text-foreground transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[520px] h-[520px] bg-green-500/10 blur-[130px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-[-20%] right-[20%] w-[420px] h-[420px] bg-green-500/5 blur-[110px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        <div
          className="absolute inset-0 opacity-[0.05] dark:opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-[460px] flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-10 text-center w-full">
          <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
            <Logo size={40} showText={true} textClassName="text-foreground tracking-wide" />
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            {t("hero_prefix")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 relative inline-block">
              {t("hero_highlight")}
              <svg className="absolute w-full h-2 -bottom-1 left-0 text-green-500" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
            <br />
            {t("hero_suffix")}
          </h1>

          <div className="mt-2 grid w-full gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3 sm:text-center">
            {setupSteps.map((step) => (
              <div key={step} className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2 sm:justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl font-semibold text-foreground/90">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>

        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t("secured_by")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
            <Trans t={t} i18nKey="terms_accept" ns="auth">
              En vous inscrivant, vous acceptez nos{" "}
              <Link href="/terms">termes</Link> et{" "}
              <Link href="/privacy">politique de confidentialité</Link>.
            </Trans>
          </div>
        </div>
      </div>
    </div>
  )
}
