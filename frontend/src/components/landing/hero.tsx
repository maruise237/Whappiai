"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"

import { ChatPreview } from "@/components/landing/chat-preview"

const avatars = [
  "https://i.ibb.co/1tkgLkgd/Gemini-Generated-Image-1ykssf1ykssf1dyks.png",
  "https://i.ibb.co/hx78Kb9z/Annotation-2026-02-16-211337.png",
  "https://i.ibb.co/zTL3Q6t9/Male-Professional-Headshot-East-African.jpg",
  "https://i.ibb.co/kg0ppRdz/Create-your-professional-DP-and-add-it-to-your.jpg",
  "https://i.ibb.co/QW6p9bH/t-l-chargement-2.jpg",
]

const features = [
  "Réponses Instantanées",
  "Modération 24/7",
  "Anti-Spam IA",
  "Analyses Détaillées"
]

const dynamicWords = [
  "Support Client",
  "Modération",
  "Marketing",
  "Communauté",
  "Vente",
  "Business"
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
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const animate = () => {
      const randomDelay = Math.floor(Math.random() * 2000) + 2500 // 2.5s - 4.5s random delay
      timeoutId = setTimeout(() => {
        setIndex((prev) => (prev + 1) % dynamicWords.length)
        animate()
      }, randomDelay)
    }
    animate()
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-16 lg:pt-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card pointer-events-none" />
      
      {/* Background Shapes for Desktop */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none hidden lg:block translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none hidden lg:block -translate-x-1/4 translate-y-1/4" />

      <div className="container px-4 mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-sm font-medium text-primary">Automatisation WhatsApp Intelligente</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              <span className="block overflow-hidden">
                <motion.span 
                  className="block" 
                  variants={textRevealVariants} 
                  initial="hidden" 
                  whileInView="visible"
                  viewport={{ once: false }}
                  custom={0}
                >
                  Automatisez votre
                </motion.span>
              </span>
              <span className="block overflow-hidden h-[1.3em] relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={index}
                    className="block text-primary absolute top-0 left-0 w-full text-center lg:text-left"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <span className="relative inline-block px-2">
                      {dynamicWords[index]}
                      {/* Modern Adaptive Underline */}
                      <span className="absolute -bottom-2 left-0 w-full h-3 bg-primary/20 -rotate-1 rounded-full -z-10 blur-[1px]"></span>
                      <span className="absolute -bottom-2 left-0 w-full h-[3px] bg-primary/80 -rotate-1 rounded-full z-10"></span>
                    </span>
                  </motion.span>
                </AnimatePresence>
                {/* Invisible spacer to maintain width/height */}
                <span className="invisible">{dynamicWords[0]}</span>
              </span>
              <span className="block overflow-hidden">
                <motion.span 
                  className="block" 
                  variants={textRevealVariants} 
                  initial="hidden" 
                  whileInView="visible"
                  viewport={{ once: false }}
                  custom={2}
                >
                  avec Whappi AI
                </motion.span>
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg"
            >
              Engagez votre communauté 24/7 avec un assistant IA qui répond, modère et convertit. Sans code, prêt en 5 minutes.
            </motion.p>

            {/* Feature List (Desktop Only) */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
              transition={{ delay: 0.3 }}
              className="hidden lg:flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
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
              className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 pt-2"
            >
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                asChild
              >
                <Link href="/register">
                  Commencer Gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-base font-medium border-border hover:bg-muted/50 transition-all hover:scale-105"
                asChild
              >
                <Link href="#features">Voir la Démo</Link>
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-4 pt-4"
            >
              <div className="flex items-center -space-x-4">
                {avatars.map((avatar, index) => (
                  <div
                    key={index}
                    className="relative z-10 hover:z-20 transition-all duration-300 hover:scale-110"
                  >
                    <img
                      src={avatar || "/placeholder.svg"}
                      alt=""
                      className="w-12 h-12 rounded-full border-4 border-background object-cover shadow-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-bold">4.9/5</span> par 1000+ équipes
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Chat Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto lg:mr-0 lg:ml-auto w-full max-w-[400px] lg:max-w-[450px] perspective-1000"
          >
            {/* Decorative Elements behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-full blur-[60px] animate-pulse-slow pointer-events-none" />
            
            {/* Floating Elements (Desktop Only) */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -right-8 z-20 hidden lg:flex items-center gap-2 bg-card/90 backdrop-blur border border-border/50 p-3 rounded-2xl shadow-xl"
            >
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-bold">API Connectée</p>
                <p className="text-[10px] text-muted-foreground">Latence: 24ms</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -left-8 z-20 hidden lg:flex items-center gap-2 bg-card/90 backdrop-blur border border-border/50 p-3 rounded-2xl shadow-xl"
            >
              <div className="flex -space-x-2">
                 <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-card" />
                 <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-card" />
                 <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-card" />
              </div>
              <p className="text-xs font-bold pl-1">+150 Membres</p>
            </motion.div>

            <div className="relative transform transition-transform duration-500 hover:rotate-y-2 hover:rotate-x-2">
              <ChatPreview />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
