"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Rocket, Sparkles } from "lucide-react";

const ROADMAP_ITEMS = [
  {
    status: "Terminé",
    title: "Moteur IA V1",
    description: "Intégration de DeepSeek et OpenAI pour les réponses automatiques.",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    status: "En cours",
    title: "Dashboard Admin Pro",
    description: "Vision 360 des utilisateurs et gestion granulaire des crédits.",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    status: "À venir",
    title: "Multi-Agents IA",
    description: "Possibilité de créer plusieurs assistants avec des personnalités différentes.",
    icon: Rocket,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    status: "Prévu Q3 2026",
    title: "Analyse de Sentiments",
    description: "Détection automatique du ton des messages pour adapter la réponse.",
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  }
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6">Roadmap 2026</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            L&apos;avenir de <span className="text-primary">Whappi</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Découvrez les fonctionnalités sur lesquelles nous travaillons pour révolutionner
            votre automatisation WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ROADMAP_ITEMS.map((item, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1">{item.status}</Badge>
                    <CardTitle>{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
