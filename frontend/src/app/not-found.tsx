"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Home, ArrowRight, MessageSquare, FileText } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <h1 className="relative text-9xl font-bold text-primary opacity-20">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-foreground">Oups !</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold text-foreground">
            Cette page semble avoir disparu dans le cloud.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Ne vous inquiétez pas, même les meilleures IA perdent parfois le fil.
            Profitez-en pour découvrir comment nous pouvons optimiser votre WhatsApp.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto"
        >
          <Button asChild size="lg" className="w-full gap-2">
            <Link href="/">
              <Home size={18} />
              Retour à l'accueil
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full gap-2">
            <Link href="/register">
              <ArrowRight size={18} />
              Essai Gratuit
            </Link>
          </Button>
        </motion.div>

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="pt-8 border-t border-border"
        >
            <p className="text-sm text-muted-foreground mb-4">Ou consultez nos ressources utiles :</p>
            <div className="flex justify-center gap-6">
                <Link href="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <FileText size={16} />
                    Documentation
                </Link>
                <Link href="/#pricing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <MessageSquare size={16} />
                    Tarifs
                </Link>
            </div>
        </motion.div>
      </div>
    </div>
  )
}
