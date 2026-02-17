"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ShieldCheck, Zap } from "lucide-react"
import Link from "next/link"

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Whappi Enterprise
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            L'infrastructure WhatsApp <br />
            <span className="text-primary">à l'échelle industrielle</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Pour les entreprises qui envoient plus de 100k messages par mois. SLA garanti, support dédié et déploiement sur mesure.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 rounded-full">
              Parler à un expert
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full">
              Voir la documentation
            </Button>
          </div>
        </div>
      </section>
      
      {/* Comparison Table */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-card rounded-2xl border">
              <h3 className="text-2xl font-bold mb-4">Starter</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 1 Instance</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 1000 msg/jour</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Support Email</li>
              </ul>
            </div>
            <div className="p-8 bg-card rounded-2xl border border-primary relative overflow-hidden">
               <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-bl-xl">Populaire</div>
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 5 Instances</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Illimité</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Support Prioritaire</li>
              </ul>
            </div>
            <div className="p-8 bg-card rounded-2xl border bg-primary/5 border-primary/20">
              <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Instances Dédiées</li>
                <li className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Haute Disponibilité</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Account Manager</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
