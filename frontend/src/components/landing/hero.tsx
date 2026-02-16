"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const avatars = [
  "/placeholder.svg",
  "/placeholder.svg",
  "/placeholder.svg",
  "/placeholder.svg",
  "/placeholder.svg",
]

const textRevealVariants = {
  hidden: { y: "100%" },
  visible: (i: number) => ({
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: i * 0.1,
    },
  }),
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card pointer-events-none" />

      {/* Subtle radial glow - Whappi green */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[50vh] max-h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center px-4">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-sm text-muted-foreground">Automatisation WhatsApp Intelligente</span>
        </motion.div>

        {/* Headline with text mask animation */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6"
          style={{ fontFamily: "var(--font-cal-sans), sans-serif" }}
        >
          <span className="block overflow-hidden">
            <motion.span className="block" variants={textRevealVariants} initial="hidden" animate="visible" custom={0}>
              Automatisez votre Support
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              className="block text-primary"
              variants={textRevealVariants}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              et Modérez vos Groupes.
            </motion.span>
          </span>
        </h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Réponses automatiques intelligentes 24/7 et outils de modération avancés pour engager et protéger votre communauté WhatsApp.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Button
            size="lg"
            className="shimmer-btn bg-primary text-primary-foreground hover:bg-secondary rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/register">
              Essai Gratuit 14 Jours
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 text-base font-medium border-border text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary bg-transparent"
            asChild
          >
            <Link href="#features">Voir Démo</Link>
          </Button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center -space-x-3">
            {avatars.map((avatar, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                className="relative"
              >
                <img
                  src={avatar || "/placeholder.svg"}
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-background object-cover"
                />
              </motion.div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Utilisé par <span className="text-foreground font-medium">1000+</span> Community Managers
          </p>
        </motion.div>
      </div>
    </section>
  )
}
