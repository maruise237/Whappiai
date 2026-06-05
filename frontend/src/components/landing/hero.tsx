"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

const avatars = [
  "/avatars/avatar1.webp",
  "/avatars/avatar2.webp",
  "/avatars/avatar3.webp",
  "/avatars/avatar4.webp",
  "/avatars/avatar5.webp",
]

const features = [
  "Accueil automatique",
  "Anti-liens & anti-spam",
  "Avertissements + ban auto",
  "Dashboard multi-groupes"
]

const adminLoop = [
  "Spams supprimés",
  "Nouveaux membres accueillis",
  "Règles appliquées",
  "Rappels envoyés",
  "Admins moins sollicités",
  "Groupes plus calmes"
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
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-16 lg:pt-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card pointer-events-none" />
      
      {/* Background Shapes for Desktop */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none hidden lg:block translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none hidden lg:block -translate-x-1/4 translate-y-1/4" />

      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-sm font-semibold text-primary dark:text-emerald-400">Gestion de groupes WhatsApp</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.1] flex flex-col items-center">
            <span className="block overflow-hidden">
              <motion.span 
                className="block" 
                variants={textRevealVariants} 
                initial="hidden" 
                whileInView="visible"
                viewport={{ once: false }}
                custom={0}
              >
                Le bot d&apos;admin
              </motion.span>
            </span>
            <span className="block text-primary">que vos groupes</span>
            <span className="block overflow-hidden">
              <motion.span 
                className="block" 
                variants={textRevealVariants} 
                initial="hidden" 
                whileInView="visible"
                viewport={{ once: false }}
                custom={2}
              >
                WhatsApp attendaient
              </motion.span>
            </span>
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Whappi automatise l&apos;accueil, la modération et les rappels dans vos groupes WhatsApp. Fait pour les admins africains qui gèrent des communautés actives.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-border/70 bg-card/50 py-3 shadow-sm"
            aria-label="Actions automatisées par Whappi"
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
            <div className="whappi-flow-track flex w-max items-center gap-3 text-sm font-medium text-muted-foreground">
              {[...adminLoop, ...adminLoop].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-primary/15 bg-primary/5 px-3 py-1.5 text-foreground/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Feature List (Desktop Only) */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.3 }}
            className="hidden lg:flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 pt-2 justify-center"
          >
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
              asChild
            >
              <Link href="/register">
                Essayer gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-14 text-base font-medium border-border hover:bg-muted/50 transition-all hover:scale-105"
              asChild
            >
              <Link href="#features">Voir comment ça marche</Link>
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col items-center gap-4 pt-4"
          >
            <div className="flex items-center -space-x-4">
              {avatars.map((avatar, index) => (
                <div
                  key={index}
                  className="relative z-10 hover:z-20 transition-all duration-300 hover:scale-110 w-12 h-12 rounded-full border-4 border-background shadow-sm overflow-hidden"
                >
                  <Image
                    src={avatar || "/placeholder.svg"}
                    alt="Utilisateur satisfait de Whappi"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-foreground font-bold">Pensé pour</span> églises, écoles, tontines et communautés business
              </p>
            </div>
          </motion.div>
        </div>
      </div>

    </section>
  )
}
