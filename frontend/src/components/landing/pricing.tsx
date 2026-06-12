"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
  {
    id: "trial",
    name: "Essai gratuit",
    description: "Pour connecter 1 groupe et verifier que Whappi modere bien en situation reelle.",
    price: "7 jours",
    cadence: "sans engagement",
    features: [
      "1 groupe pendant 7 jours",
      "Blocage des liens",
      "Mots interdits choisis manuellement",
      "Auto-exclusion activable",
      "Message de bienvenue redige par vous",
    ],
    cta: "Commencer l'essai",
    highlighted: false,
    footer: "Le plus simple pour valider votre premier groupe",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Pour moderer simplement jusqu'a 3 groupes avec les regles essentielles.",
    price: "3 500 FCFA",
    cadence: "/mois",
    features: [
      "Jusqu'a 3 groupes",
      "Blocage des liens",
      "Mots interdits choisis manuellement",
      "Auto-exclusion activable",
      "Message de bienvenue redige par vous",
    ],
    cta: "Passer sur Starter",
    highlighted: false,
    footer: "Parfait pour demarrer proprement",
  },
  {
    id: "pro",
    name: "Pro IA",
    description: "Pour aller plus loin avec l'IA sur jusqu'a 6 groupes.",
    price: "8 000 FCFA",
    cadence: "/mois",
    features: [
      "Jusqu'a 6 groupes",
      "Toute la moderation Starter",
      "Assistant IA pour aider l'admin",
      "Fonctions IA plus poussees",
      "Presets de moderation en option",
      "Automatisations plus confortables",
    ],
    cta: "Passer sur Pro IA",
    highlighted: true,
    footer: "Le meilleur point d'equilibre pour grandir",
  },
  {
    id: "business",
    name: "Business",
    description: "Pour les structures qui veulent plus de puissance sur jusqu'a 16 groupes.",
    price: "18 000 FCFA",
    cadence: "/mois",
    features: [
      "Jusqu'a 16 groupes",
      "Tout le plan Pro IA",
      "Fonctionnalites avancees",
      "Administration plus poussee",
      "Presets de moderation en option",
      "Priorite sur les evolutions premium",
    ],
    cta: "Passer sur Business",
    highlighted: false,
    footer: "Pour les reseaux qui veulent scaler serieusement",
  },
]

export function Pricing() {
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
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
            Des forfaits simples pour proteger vos groupes WhatsApp
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:mb-10 sm:text-lg">
            Commencez avec un essai concret, passez a une moderation simple, puis ajoutez l&apos;IA et la puissance quand vos groupes grossissent.
          </p>
          <p className="text-sm font-medium text-primary">7 jours d&apos;essai gratuit avec 1 groupe pour voir Whappi moderer avant de payer.</p>
        </motion.div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={cn(
                "relative rounded-2xl p-6 transition-all duration-300 sm:p-8",
                plan.highlighted
                  ? "z-10 scale-[1.02] border-2 border-primary bg-card shadow-lg"
                  : "z-0 border border-border/70 bg-card/70 hover:border-primary/50 hover:bg-card",
                plan.id === "trial" && "border-state-warning/30 bg-state-warning-light/35"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-lg sm:px-4 sm:text-sm">
                  <span>*</span> Le plus rentable
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("mb-2 text-xl font-semibold", plan.highlighted ? "text-primary" : "text-foreground")}>
                  {plan.name}
                </h3>
                <p className="mb-2 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mb-2 flex flex-wrap items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground sm:text-4xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.id === "trial" ? "Testez avant de vous abonner" : "Facture mensuellement"}
                </p>
              </div>

              <div className="mb-8 space-y-4">
                {plan.features.map((feature) => (
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
                variant={plan.highlighted ? "default" : plan.id === "trial" ? "outline" : "secondary"}
                asChild
              >
                <Link href={`/register?plan=${plan.id === "trial" ? "trial" : plan.id}`}>
                  {plan.cta}
                </Link>
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">{plan.footer}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
