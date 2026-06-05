"use client"

import * as React from "react"
import { CreditCard, Info, ShieldCheck, Users, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BillingPlans } from "@/components/dashboard/billing-plans"

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <CreditCard className="h-5 w-5 text-primary" /> Abonnement & plans
          </h1>
          <p className="text-sm text-muted-foreground">Choisissez le volume adapte a vos sessions et groupes WhatsApp.</p>
        </div>

        <Badge variant="secondary" className="h-auto rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
          Plan actuel : essai gratuit
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Sessions incluses", val: "1 / 1", icon: Zap },
          { label: "Groupes pilotes", val: "0 / 5", icon: Users },
          { label: "Regles actives", val: "0", icon: ShieldCheck }
        ].map((stat) => (
          <Card key={stat.label} className="bg-card shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.val}</p>
              </div>
              <stat.icon className="h-5 w-5 text-primary/45" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="mb-10 space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Forfaits co-admin WhatsApp</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Plus votre communaute grandit, plus Whappi vous donne de sessions, de groupes et d&apos;actions de moderation.
          </p>
        </div>

        <BillingPlans />
      </div>

      <Card className="mt-12 border-2 border-dashed bg-transparent">
        <CardContent className="flex flex-col items-center gap-6 p-6 md:flex-row">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1 text-center md:text-left">
            <h3 className="text-sm font-bold">Besoin d&apos;une solution sur-mesure ?</h3>
            <p className="text-xs text-muted-foreground">
              Pour les agences, reseaux de vente ou operations multi-pays, on peut adapter les sessions, les volumes et le suivi.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full">Contacter le support</Button>
        </CardContent>
      </Card>
    </div>
  )
}
