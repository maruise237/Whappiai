"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getPlanCards } from "@/lib/plan-features"
import { useTranslation } from "react-i18next"

export function Pricing() {
  const { t } = useTranslation("billing")
  const plans = getPlanCards(t)

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
            {t("landing_pricing_title")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:mb-10 sm:text-lg">
            {t("landing_pricing_subtitle")}
          </p>
          <p className="text-sm font-medium text-primary">{t("landing_pricing_trial_note")}</p>
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
                  <span>*</span> {t("landing_pricing_recommended_badge")}
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
                  {plan.id === "trial" ? t("landing_pricing_trial_footer") : t("landing_pricing_monthly_invoice")}
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
