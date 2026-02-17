"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, Database, Globe, Layers, Zap } from "lucide-react"
import Link from "next/link"

const integrations = [
  { name: "Node.js", icon: Code, description: "SDK officiel pour Node.js et TypeScript.", category: "Backend" },
  { name: "Python", icon: Code, description: "Client API async pour Python 3.8+.", category: "Backend" },
  { name: "PHP / Laravel", icon: Code, description: "Package Composer pour Laravel 9/10.", category: "Backend" },
  { name: "Zapier", icon: Zap, description: "Connectez Whappi à 5000+ apps sans coder.", category: "No-Code" },
  { name: "Make (Integromat)", icon: Zap, description: "Scénarios d'automatisation avancés.", category: "No-Code" },
  { name: "n8n", icon: Zap, description: "Workflow automation open-source.", category: "No-Code" },
  { name: "Supabase", icon: Database, description: "Stockez vos messages directement en DB.", category: "Database" },
  { name: "Firebase", icon: Database, description: "Déclenchez des fonctions sur messages.", category: "Database" },
]

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6">Ecosystème</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Connectez Whappi à <br />
            <span className="text-primary">vos outils préférés</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Une API, des possibilités infinies. Intégrez WhatsApp dans votre stack technique en quelques minutes.
          </p>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((item, i) => (
              <Card key={i} className="hover:border-primary/50 transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">{item.name}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/5">
                    Documentation <ArrowRight className="w-4 h-4" />
                  </Button>
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
