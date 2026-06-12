"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
  {
    id: "starter",
    name: "pricing_plan_1_name",
    description: "pricing_plan_1_desc",
    price: "pricing_plan_1_price_monthly",
    features: [
      "pricing_plan_1_feat_1",
      "pricing_plan_1_feat_2",
      "pricing_plan_1_feat_3",
      "pricing_plan_1_feat_4",
      "pricing_plan_1_feat_5",
    ],
    cta: "pricing_plan_1_cta",
    highlighted: false,
  },
  {
    id: "pro",
    name: "pricing_plan_2_name",
    description: "pricing_plan_2_desc",
    price: "pricing_plan_2_price_monthly",
    features: [
      "pricing_plan_2_feat_1",
      "pricing_plan_2_feat_2",
      "pricing_plan_2_feat_3",
      "pricing_plan_2_feat_4",
      "pricing_plan_2_feat_5",
      "pricing_plan_2_feat_6",
    ],
    cta: "pricing_plan_2_cta",
    highlighted: true,
  },
  {
    id: "business",
    name: "pricing_plan_3_name",
    description: "pricing_plan_3_desc",
    price: "pricing_plan_3_price_monthly",
    features: [
      "pricing_plan_3_feat_1",
      "pricing_plan_3_feat_2",
      "pricing_plan_3_feat_3",
      "pricing_plan_3_feat_4",
      "pricing_plan_3_feat_5",
      "pricing_plan_3_feat_6",
    ],
    cta: "pricing_plan_3_cta",
    highlighted: false,
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
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Des forfaits simples pour faire grandir Whappi
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Commencez avec une moderation claire, ajoutez l'IA au bon moment, puis passez a un niveau avance quand vos groupes grossissent.
          </p>
          <p className="text-sm font-medium text-primary">7 jours d'essai gratuit avec 1 groupe pour tester avant de payer.</p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
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
                  <span>*</span> Le plus choisi
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("mb-2 text-xl font-semibold", plan.highlighted ? "text-primary" : "text-foreground")}>
                  {plan.id === "starter" ? "Starter" : plan.id === "pro" ? "Pro IA" : "Business"}
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  {plan.id === "starter" && "Pour moderer simplement jusqu'a 3 groupes avec les regles essentielles."}
                  {plan.id === "pro" && "Pour aller plus loin avec l'IA sur jusqu'a 6 groupes."}
                  {plan.id === "business" && "Pour les structures qui veulent plus de puissance sur jusqu'a 16 groupes."}
                </p>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.id === "starter" ? "3 500 FCFA" : plan.id === "pro" ? "8 000 FCFA" : "18 000 FCFA"}
                  </span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </div>
                <p className="text-sm text-muted-foreground">Facture mensuellement</p>
              </div>

              <div className="mb-8 space-y-4">
                {(
                  plan.id === "starter"
                    ? [
                        "Jusqu'a 3 groupes",
                        "Blocage des liens",
                        "Mots interdits choisis manuellement",
                        "Auto-exclusion activable",
                        "Message de bienvenue redige par vous",
                      ]
                    : plan.id === "pro"
                      ? [
                          "Jusqu'a 6 groupes",
                          "Toute la moderation Starter",
                          "Assistant IA pour aider l'admin",
                          "Fonctions IA plus poussees",
                          "Presets de moderation en option",
                          "Automatisations plus confortables",
                        ]
                      : [
                          "Jusqu'a 16 groupes",
                          "Tout le plan Pro IA",
                          "Fonctionnalites avancees",
                          "Administration plus poussee",
                          "Presets de moderation en option",
                          "Priorite sur les evolutions premium",
                        ]
                ).map((feature) => (
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
                <Link href={`/register?plan=${plan.id}`}>
                  {plan.id === "starter" ? "Choisir Starter" : plan.id === "pro" ? "Choisir Pro IA" : "Choisir Business"}
                </Link>
              </Button>

              {!plan.highlighted && <p className="mt-4 text-center text-xs text-muted-foreground">Parfait pour commencer</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
