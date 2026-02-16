"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { motion } from "framer-motion"
import { Construction } from "lucide-react"

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center p-8 max-w-2xl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            <div className="p-6 bg-primary/10 rounded-full">
              <Construction className="w-16 h-16 text-primary" />
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-4">Blog & Ressources</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Nous préparons des guides exclusifs et des articles passionnants pour vous aider à maîtriser l'automatisation WhatsApp.
          </p>
          
          <div className="p-6 border border-border rounded-xl bg-card">
            <h3 className="font-semibold mb-2">Bientôt disponible :</h3>
            <ul className="text-left space-y-2 text-muted-foreground">
              <li>• Comment automatiser votre support client en 10 minutes</li>
              <li>• Les meilleures pratiques anti-spam pour 2026</li>
              <li>• Étude de cas : +300% d'engagement grâce à l'IA</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
