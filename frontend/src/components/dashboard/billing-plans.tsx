"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { fetchApi } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: { 
      monthly: "2 500 FCFA", 
      monthlyValue: 2500,
    },
    features: [
      "500 messages IA / mois",
      "1 numéro WhatsApp connecté",
      "Réponses automatiques 24/7",
      "Support technique par email",
      "Accès aux mises à jour"
    ],
    cta: "Choisir Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: { 
      monthly: "5 000 FCFA", 
      monthlyValue: 5000,
    },
    features: [
      "2 000 messages IA / mois",
      "Groupes WhatsApp illimités",
      "Tableau de bord Analytics",
      "Anti-spam intelligent",
      "Support prioritaire",
      "Export des données"
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: { 
      monthly: "10 000 FCFA", 
      monthlyValue: 10000,
    },
    features: [
      "10 000 messages IA / mois",
      "Tout en Pro",
      "Support dédié 24/7",
      "Intégrations API sur mesure",
      "Audit logs & Sécurité",
      "Formation des équipes"
    ],
    cta: "Choisir Business",
    highlighted: false,
  },
]

export function BillingPlans() {
  const [loading, setLoading] = useState<string | null>(null)
  const { getToken } = useAuth()

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      const token = await getToken()
      
      const response = await fetchApi('/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId }),
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.url) {
        window.location.href = response.url
      } else {
        toast.error("Impossible d'initialiser le paiement")
      }
    } catch (error) {
      console.error(error)
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto py-8">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={cn(
            "relative rounded-3xl p-8 transition-all duration-300 bg-card border",
            plan.highlighted 
              ? "border-primary shadow-2xl scale-105 z-10" 
              : "border-border hover:border-primary/50 hover:bg-accent/50 z-0 mt-4"
          )}
        >
          {plan.highlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 whitespace-nowrap">
              Populaire
            </div>
          )}

          <div className="mb-8">
            <h3 className={cn("text-xl font-semibold mb-2", plan.highlighted ? "text-primary" : "text-foreground")}>
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-foreground">
                {plan.price.monthly}
              </span>
              <span className="text-muted-foreground text-sm">
                /mois
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
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
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            onClick={() => handleSubscribe(plan.id)}
            disabled={loading === plan.id}
          >
            {loading === plan.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              plan.cta
            )}
          </Button>
        </motion.div>
      ))}
    </div>
  )
}
