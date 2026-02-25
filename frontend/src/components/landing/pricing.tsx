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
    description: "Licence Standard : L'essentiel pour démarrer. Idéale pour les freelances et les tests d'automatisation sur un numéro unique.",
    price: { 
      monthly: "2 500 FCFA", 
      yearly: "25 000 FCFA",
      monthlyValue: 2500,
      yearlyValue: 25000
    },
    features: [
      "500 messages IA / mois",
      "1 numéro WhatsApp connecté",
      "Réponses automatiques 24/7",
      "Support technique par email",
      "Accès aux mises à jour"
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Licence Commerciale : La puissance de l'IA pour votre croissance. Gestion multi-groupes et analyses détaillées pour les PME.",
    price: { 
      monthly: "5 000 FCFA", 
      yearly: "50 000 FCFA",
      monthlyValue: 5000,
      yearlyValue: 50000
    },
    features: [
      "2 000 messages IA / mois",
      "Groupes WhatsApp illimités",
      "Tableau de bord Analytics",
      "Anti-spam intelligent",
      "Support prioritaire",
      "Export des données"
    ],
    cta: "Choisir le plan Pro",
    highlighted: true,
    popular: true,
  },
  {
    name: "Business",
    description: "Licence Entreprise : Performance maximale sans compromis. Infrastructure dédiée et accompagnement sur mesure pour les grands comptes.",
    price: { 
      monthly: "10 000 FCFA", 
      yearly: "100 000 FCFA",
      monthlyValue: 10000,
      yearlyValue: 100000
    },
    features: [
      "10 000 messages IA / mois",
      "Tout en Pro",
      "Support dédié 24/7",
      "Intégrations API sur mesure",
      "Audit logs & Sécurité",
      "Formation des équipes"
    ],
    cta: "Contacter les ventes",
    highlighted: false,
  },
]

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-12 lg:py-24 px-4 bg-background overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 lg:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 tracking-tight">
            Tarification simple et transparente
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
            Automatisez vos conversations WhatsApp et générez plus de leads sans effort.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={cn("text-sm font-medium transition-colors", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Mensuel
            </span>
            <button
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
                "relative rounded-3xl p-8 transition-all duration-300",
                plan.highlighted 
                  ? "bg-card border-2 border-primary shadow-2xl scale-105 z-10" 
                  : "bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card z-0 mt-4"
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
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

