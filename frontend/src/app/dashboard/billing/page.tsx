"use client"

import { BillingPlans } from "@/components/dashboard/billing-plans"
import { Metadata } from "next"
import { CreditCard, Sparkles, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function BillingPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* Header Premium Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white/50 dark:bg-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-primary/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-left">
          <div className="p-4 bg-primary/10 rounded-2xl border-2 border-primary/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                Abonnement
              </h1>
              <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg bg-primary/5 border-primary/20 text-primary shadow-lg backdrop-blur-md">
                Plan Actuel: Pro
              </Badge>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-relaxed max-w-md">
              Gérez votre plan de service, consultez vos limites et optimisez vos coûts d'automatisation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto justify-center">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-500 flex items-center gap-3">
            <Zap className="w-5 h-5 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tight">Status</span>
              <span className="text-xs font-black uppercase">Service Actif</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tight">Utilisation</span>
              <span className="text-xs font-black uppercase">92% Disponible</span>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-8 delay-150 duration-500">
        <BillingPlans />
      </div>
    </div>
  )
}
