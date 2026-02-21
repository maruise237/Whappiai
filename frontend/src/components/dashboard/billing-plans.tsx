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
      monthly: "2,500 FCFA",
      monthlyValue: 2500,
    },
    features: [
      "500 AI messages / month",
      "1 WhatsApp session connected",
      "24/7 Smart auto-responses",
      "Email technical support",
      "Standard API access"
    ],
    cta: "Choose Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: {
      monthly: "5,000 FCFA",
      monthlyValue: 5000,
    },
    features: [
      "2,000 AI messages / month",
      "Unlimited WhatsApp groups",
      "Advanced Analytics dashboard",
      "Intelligent anti-spam",
      "Priority customer support",
      "Data export (CSV/JSON)"
    ],
    cta: "Choose Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: {
      monthly: "10,000 FCFA",
      monthlyValue: 10000,
    },
    features: [
      "10,000 AI messages / month",
      "Everything in Pro",
      "Dedicated 24/7 account manager",
      "Custom API integrations",
      "Audit logs & Security",
      "Team training sessions"
    ],
    cta: "Choose Business",
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
        toast.error("Unable to initialize payment")
      }
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto py-8">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className={cn(
            "relative rounded-lg p-8 transition-all duration-200 bg-card border shadow-sm",
            plan.highlighted
              ? "border-primary shadow-md z-10 scale-[1.02]"
              : "border-border hover:border-border/80 z-0"
          )}
        >
          {plan.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded text-[10px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
              Most Popular
            </div>
          )}

          <div className="mb-8">
            <h3 className={cn("text-lg font-bold tracking-tight mb-2", plan.highlighted ? "text-primary uppercase" : "text-foreground")}>
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold tracking-tighter text-foreground">
                {plan.price.monthly}
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                /month
              </span>
            </div>
          </div>

          <div className="space-y-3.5 mb-8">
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn(
                  "mt-1 p-0.5 rounded-full shrink-0",
                  plan.highlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </div>
                <span className="text-xs text-muted-foreground font-medium leading-tight">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            className={cn(
              "w-full h-10 rounded-md text-sm font-semibold transition-all duration-200",
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
                Processing...
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
