"use client"

import * as React from "react"
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BillingPlans } from "@/components/dashboard/billing-plans"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Abonnement & Plans
          </h1>
          <p className="text-sm text-muted-foreground">Gérez vos limites et boostez votre automatisation.</p>
        </div>

        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 h-auto text-[10px] font-semibold tracking-widest rounded-full">
           Plan Actuel : ESSAI GRATUIT
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {[
           { label: "Sessions", val: "1/2", icon: Zap },
           { label: "Messages IA", val: "42/100", icon: Sparkles },
           { label: "Soutien", val: "Standard", icon: ShieldCheck }
         ].map((stat, i) => (
           <Card key={i} className="border-none bg-muted/20 shadow-none">
             <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.val}</p>
                </div>
                <stat.icon className="h-5 w-5 text-muted-foreground/30" />
             </CardContent>
           </Card>
         ))}
      </div>

      <div className="space-y-6">
        <div className="text-center space-y-2 mb-10">
           <h2 className="text-2xl font-bold tracking-tight">Choisissez votre puissance</h2>
           <p className="text-muted-foreground text-sm max-w-sm mx-auto">Activez plus de sessions et d&apos;intelligence IA dès maintenant.</p>
        </div>

        <BillingPlans />
      </div>

      <Card className="border-dashed border-2 bg-transparent mt-12">
         <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <Info className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
               <h3 className="text-sm font-bold">Besoin d&apos;une solution sur-mesure ?</h3>
               <p className="text-xs text-muted-foreground">Pour les agences ou les volumes massifs (+10k messages/jour), contactez notre équipe support pour un plan Enterprise.</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full">Contacter le Support</Button>
         </CardContent>
      </Card>
    </div>
  )
}
