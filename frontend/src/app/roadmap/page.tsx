"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle, Clock } from "lucide-react"

export default function RoadmapPage() {
  const roadmap = [
    {
      quarter: "Q1 2026",
      status: "completed",
      items: [
        "Lancement de l'API v1.0",
        "Support Multi-sessions",
        "Dashboard Administrateur",
        "Webhooks v1"
      ]
    },
    {
      quarter: "Q2 2026",
      status: "in_progress",
      items: [
        "Support des messages interactifs (Boutons, Listes)",
        "Analytiques avancées",
        "Plugin WordPress officiel",
        "Intégration Zapier native"
      ]
    },
    {
      quarter: "Q3 2026",
      status: "planned",
      items: [
        "Gestionnaire de campagnes marketing",
        "Chatbot Builder visuel (No-Code)",
        "Application mobile (iOS/Android)",
        "API GraphQL"
      ]
    },
    {
      quarter: "Q4 2026",
      status: "planned",
      items: [
        "Whappi AI: Réponses automatiques intelligentes",
        "Support Enterprise SLA 99.99%",
        "Certification SOC2",
        "Marketplace d'extensions"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Vision
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Roadmap <span className="text-primary">Produit</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez ce que nous préparons pour le futur de la communication WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roadmap.map((phase, i) => (
              <Card key={i} className={`relative overflow-hidden ${phase.status === 'in_progress' ? 'border-primary ring-1 ring-primary' : ''}`}>
                {phase.status === 'in_progress' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
                    En cours
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {phase.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {phase.status === 'in_progress' && <Clock className="w-5 h-5 text-primary animate-pulse" />}
                    {phase.status === 'planned' && <Circle className="w-5 h-5 text-muted-foreground" />}
                    {phase.quarter}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
