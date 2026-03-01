"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { motion } from "framer-motion"
import { Users, Code, Rocket, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">À propos de Whappi</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Notre mission est de rendre l"automatisation WhatsApp accessible, sécurisée et intelligente pour toutes les communautés.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">L"histoire</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Né d"un besoin de simplifier la gestion de grands groupes WhatsApp, Whappi a évolué pour devenir une plateforme complète d"automatisation.
              Nous croyons que la modération ne devrait pas être une corvée, mais une opportunité d"engagement.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Basée à Paris, notre équipe de passionnés travaille chaque jour pour repousser les limites de ce qui est possible avec l"API WhatsApp.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-card border border-border rounded-2xl text-center hover:border-primary transition-colors">
              <Users className="w-8 h-8 mx-auto mb-4 text-primary" />
              <div className="font-bold text-2xl">10k+</div>
              <div className="text-sm text-muted-foreground">Utilisateurs</div>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl text-center hover:border-primary transition-colors">
              <Globe className="w-8 h-8 mx-auto mb-4 text-primary" />
              <div className="font-bold text-2xl">15+</div>
              <div className="text-sm text-muted-foreground">Pays</div>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl text-center hover:border-primary transition-colors">
              <Code className="w-8 h-8 mx-auto mb-4 text-primary" />
              <div className="font-bold text-2xl">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl text-center hover:border-primary transition-colors">
              <Rocket className="w-8 h-8 mx-auto mb-4 text-primary" />
              <div className="font-bold text-2xl">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>

        <div className="text-center bg-muted/30 rounded-3xl p-12">
            <h2 className="text-3xl font-bold mb-6">Rejoignez l"aventure</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Nous recrutons des talents passionnés par l"IA et la communication.
            </p>
            <a href="mailto:jobs@whappi.com" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-primary-foreground bg-primary hover:bg-primary/90 transition-colors">
                Voir les offres
            </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
