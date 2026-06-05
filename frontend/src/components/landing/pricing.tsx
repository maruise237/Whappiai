"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Starter",
    description: "Pour tester et gerer un seul groupe actif.",
    price: { monthly: "3 500 FCFA", yearly: "33 600 FCFA", monthlyValue: 3500, yearlyValue: 33600 },
    features: [
      "1 groupe connecte",
      "Bienvenue dans le groupe",
      "Filtre de mots interdits jusqu'a 20",
      "Systeme avertissements + ban auto",
      "3 messages programmes actifs",
    ],
    cta: "Choisir Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Pour les admins serieux qui gerent plusieurs groupes actifs.",
    price: { monthly: "8 000 FCFA", yearly: "76 800 FCFA", monthlyValue: 8000, yearlyValue: 76800 },
    features: [
      "Jusqu'a 5 groupes connectes",
      "Bienvenue dans le groupe",
      "Filtre mots illimite + anti-liens",
      "Messages programmes illimites",
      "Dashboard complet + logs",
      "Presets de configuration",
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    name: "Organisation",
    description: "Pour associations, medias, formations ou reseaux larges.",
    price: { monthly: "18 000 FCFA", yearly: "172 800 FCFA", monthlyValue: 18000, yearlyValue: 172800 },
    features: [
      "Jusqu'a 20 groupes connectes",
      "Toutes les fonctionnalites Pro",
      "Liste noire partagee entre groupes",
      "Logs avances de moderation",
      "Accompagnement configuration",
      "Support prioritaire WhatsApp",
    ],
    cta: "Choisir Organisation",
    highlighted: false,
  },
]

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="relative overflow-hidden bg-background px-4 py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-primary/5 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[420px] w-[420px] rounded-full bg-primary/5 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Des prix penses pour le terrain
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Payable en FCFA, adapte aux admins de groupes WhatsApp, avec 7 jours d&apos;essai pour voir la difference avant de payer.
          </p>

          <div className="mb-12 flex items-center justify-center gap-4">
            <span className={cn("text-sm font-medium transition-colors", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Mensuel
            </span>
            <button
              aria-label="Toggle annual billing"
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isAnnual ? "bg-primary" : "bg-input"
              )}
            >
              <span className={cn("pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform", isAnnual ? "translate-x-5" : "translate-x-0")} />
            </button>
            <span className={cn("flex items-center gap-2 text-sm font-medium transition-colors", isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Annuel
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                -20%
              </span>
            </span>
          </div>
        </motion.div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl p-8 transition-all duration-300",
                plan.highlighted
                  ? "z-10 scale-[1.02] border-2 border-primary bg-card shadow-lg"
                  : "z-0 mt-4 border border-border/70 bg-card/70 hover:border-primary/50 hover:bg-card"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-lg">
                  <span>★</span> 82% choisissent ce plan
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("mb-2 text-xl font-semibold", plan.highlighted ? "text-primary" : "text-foreground")}>
                  {plan.name}
                </h3>
                <div className="mb-2 flex items-baseline gap-1">
                  {isAnnual && (
                    <span className="mr-2 text-lg text-muted-foreground line-through decoration-destructive/50">
                      {Math.round(plan.price.monthlyValue * 12).toLocaleString()} FCFA
                    </span>
                  )}
                  <span className="text-4xl font-bold text-foreground">
                    {isAnnual ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/{isAnnual ? "an" : "mois"}</span>
                </div>
                <p className="text-sm text-muted-foreground">{isAnnual ? "Facture annuellement" : "Facture mensuellement"}</p>
              </div>

              <div className="mb-8 space-y-4">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className={cn("mt-1 shrink-0 rounded-full p-0.5", plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <span className="text-sm leading-tight text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={cn("h-12 w-full rounded-xl text-base font-semibold transition-all duration-200", plan.highlighted ? "shadow-md shadow-primary/20 hover:scale-[1.02]" : "")}
                variant={plan.highlighted ? "default" : "secondary"}
                asChild
              >
                <Link href="/register">{plan.cta}</Link>
              </Button>

              {!plan.highlighted && <p className="mt-4 text-center text-xs text-muted-foreground">Parfait pour demarrer</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
