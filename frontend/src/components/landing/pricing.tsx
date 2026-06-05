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
    description: "Pour un admin qui veut remettre de l'ordre dans un premier groupe sans complexité.",
    price: { 
      monthly: "3 500 FCFA", 
      yearly: "33 600 FCFA",
      monthlyValue: 3500,
      yearlyValue: 33600
    },
    features: [
      "1 groupe WhatsApp actif",
      "Message de bienvenue personnalisé",
      "Anti-liens et mots interdits",
      "Avertissements automatiques",
      "Support WhatsApp standard"
    ],
    cta: "Essayer Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Le meilleur choix pour les admins qui gèrent plusieurs groupes ou une communauté qui grandit.",
    price: { 
      monthly: "8 000 FCFA", 
      yearly: "76 800 FCFA",
      monthlyValue: 8000,
      yearlyValue: 76800
    },
    features: [
      "Jusqu'à 5 groupes actifs",
      "Tout en Starter",
      "Ban automatique après seuil",
      "Messages programmés",
      "Dashboard multi-groupes",
      "Support prioritaire",
    ],
    cta: "Choisir le plan Pro",
    highlighted: true,
    popular: true,
  },
  {
    name: "Organisation",
    description: "Pour les écoles, églises, médias et associations qui ont besoin d'un cadre plus solide.",
    price: { 
      monthly: "18 000 FCFA", 
      yearly: "172 800 FCFA",
      monthlyValue: 18000,
      yearlyValue: 172800
    },
    features: [
      "Groupes actifs étendus",
      "Tout en Pro",
      "Presets par type de communauté",
      "Logs avancés de modération",
      "Accompagnement configuration",
      "Option numéro dédié Whappi"
    ],
    cta: "Parler à Whappi",
    highlighted: false,
  },
]

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 px-4 bg-background overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[420px] h-[420px] bg-primary/5 blur-[110px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[420px] h-[420px] bg-primary/5 blur-[110px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Des prix pensés pour le terrain
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
            Payable en FCFA, adapté aux admins de groupes WhatsApp, avec 7 jours d&apos;essai pour voir la différence avant de payer.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
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
              <span
                className={cn(
                  "pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  isAnnual ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Annuel
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                -20%
              </span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
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
                  ? "bg-card border-2 border-primary shadow-lg scale-[1.02] z-10" 
                  : "bg-card/70 border border-border/70 hover:border-primary/50 hover:bg-card z-0 mt-4"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 whitespace-nowrap">
                  <span className="text-yellow-300">★</span> 82% Choisissent ce plan
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("text-xl font-semibold mb-2", plan.highlighted ? "text-primary" : "text-foreground")}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  {isAnnual && (
                    <span className="text-lg text-muted-foreground line-through decoration-destructive/50 mr-2">
                      {Math.round(plan.price.monthlyValue * 12).toLocaleString()} FCFA
                    </span>
                  )}
                  <span className="text-4xl font-bold text-foreground">
                    {isAnnual ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{isAnnual ? "an" : "mois"}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {isAnnual ? "Facturé annuellement" : "Facturé mensuellement"}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 p-0.5 rounded-full shrink-0", 
                      plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-foreground/90 leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={cn(
                  "w-full h-12 rounded-xl text-base font-semibold transition-all duration-200",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                asChild
              >
                <Link href="/register">
                  {plan.cta}
                </Link>
              </Button>

              {!plan.highlighted && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Parfait pour démarrer
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
