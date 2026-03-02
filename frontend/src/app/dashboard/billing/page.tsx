"use client"

import * as React from "react"
import {
  CreditCard,
  Zap,
  Sparkles,
  ShieldCheck,
  Info,
  Calendar,
  CheckCircle2,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BillingPlans } from "@/components/dashboard/billing-plans"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly")

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black tracking-[0.2em] px-2 h-5">
            Abonnement & Facturation
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Boostez votre productivité</h1>
          <p className="text-sm text-muted-foreground max-w-md">Gérez vos limites de messages, activez plus de sessions et débloquez la puissance de l&apos;IA.</p>
        </div>

        <div className="flex items-center gap-3 p-1.5 bg-muted/30 rounded-full border border-border/40 w-fit">
           <button
             onClick={() => setBillingCycle("monthly")}
             className={cn(
               "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all",
               billingCycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
             )}
           >
             Mensuel
           </button>
           <button
             onClick={() => setBillingCycle("yearly")}
             className={cn(
               "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-2",
               billingCycle === "yearly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
             )}
           >
             Annuel <Badge className="h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-none text-[8px]">-20%</Badge>
           </button>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: "Sessions actives", val: "1 / 2", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
           { label: "Messages ce mois", val: "42 / 100", icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
           { label: "Support client", val: "Standard", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10" }
         ].map((stat, i) => (
           <Card key={i} className="border-border/40 bg-card/50 shadow-none overflow-hidden group">
             <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", stat.bg)}>
                   <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.val}</p>
                </div>
             </CardContent>
           </Card>
         ))}
      </div>

      {/* Pricing Section */}
      <div className="space-y-8">
        <BillingPlans cycle={billingCycle} />
      </div>

      {/* Enterprise CTA */}
      <Card className="border-none bg-zinc-900 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
         <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
               <Info className="h-10 w-10 text-white/40" />
            </div>
            <div className="flex-1 space-y-3 text-center md:text-left">
               <h3 className="text-xl font-bold tracking-tight">Besoin d&apos;une solution sur-mesure ?</h3>
               <p className="text-sm text-zinc-400 max-w-xl">Pour les agences ou les volumes massifs (+10k messages/jour), profitez d&apos;une infrastructure dédiée, de SLAs garantis et d&apos;un support prioritaire 24/7.</p>
               <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Multi-instances
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> White-label
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> On-premise
                  </div>
               </div>
            </div>
            <Button size="lg" className="rounded-full bg-white text-black hover:bg-zinc-200 h-12 px-8 font-bold text-xs uppercase tracking-widest shrink-0">
               Contacter les Ventes
            </Button>
         </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex flex-col md:flex-row items-center justify-between py-6 border-t border-border/40 gap-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" /> Prochain prélèvement : 12 Mars 2025
        </p>
        <div className="flex items-center gap-6">
           <button className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Historique des factures</button>
           <button className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">Mode de paiement <ChevronRight className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  )
}
