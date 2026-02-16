"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { Activity, Command, BarChart3, Zap, Shield, Brain, Users, Gauge, Bell } from "lucide-react"

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function SystemStatus() {
  const [dots, setDots] = useState([true, true, true, false, true])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => prev.map(() => Math.random() > 0.2))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      {dots.map((active, i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-zinc-700"}`}
          animate={active ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function KeyboardCommand() {
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPressed(true)
      setTimeout(() => setPressed(false), 200)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1">
      <motion.kbd
        animate={pressed ? { scale: 0.95, y: 2 } : { scale: 1, y: 0 }}
        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-mono"
      >
        ⌘
      </motion.kbd>
      <motion.kbd
        animate={pressed ? { scale: 0.95, y: 2 } : { scale: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-mono"
      >
        K
      </motion.kbd>
    </div>
  )
}

function AnimatedChart() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  const points = [
    { x: 0, y: 60 },
    { x: 20, y: 45 },
    { x: 40, y: 55 },
    { x: 60, y: 30 },
    { x: 80, y: 40 },
    { x: 100, y: 15 },
  ]

  const pathD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`
  }, "")

  return (
    <svg ref={ref} viewBox="0 0 100 70" className="w-full h-24">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(255,255,255)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {isInView && (
        <>
          <path d={`${pathD} L 100 70 L 0 70 Z`} fill="url(#chartGradient)" className="opacity-50" />
          <path d={pathD} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="draw-line" />
        </>
      )}
    </svg>
  )
}

export function BentoGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-instrument-sans)" }}
          >
            Deux Piliers pour votre Succès
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            IA intégrée pour un support automatisé et modération intelligente pour des communautés saines et engagées.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Large card - AI & Auto Responses */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative p-6 rounded-2xl bg-card border border-border hover:border-primary hover:scale-[1.02] transition-all duration-300 overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                  <Brain className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">IA Intégrée - Support 24/7</h3>
                <p className="text-muted-foreground text-sm">
                  Réponses automatiques intelligentes basées sur votre documentation. Compréhension du langage naturel et escalade vers agents humains.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {["Multilingue", "Escalade", "NLP", "24/7"].map((feature) => (
                <div key={feature} className="text-center">
                  <div className="text-xs font-semibold text-primary mb-1">✓</div>
                  <div className="text-xs text-muted-foreground">{feature}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Anti-Spam */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary hover:scale-[1.02] transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
              <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Anti-Spam Automatique</h3>
            <p className="text-muted-foreground text-sm mb-4">Détection intelligente des liens malveillants, insultes et flood de messages.</p>
            <div className="text-sm text-primary font-semibold">Détection en temps réel</div>
          </motion.div>

          {/* Gestion des Membres */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary hover:scale-[1.02] transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
              <Users className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Gestion des Membres</h3>
            <p className="text-muted-foreground text-sm mb-4">Outils d'animation et gestion avancée des participants du groupe.</p>
            <div className="text-sm text-primary font-semibold">Modération simplifiée</div>
          </motion.div>

          {/* Analytics Groupe */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary hover:scale-[1.02] transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
              <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Détaillés</h3>
            <p className="text-muted-foreground text-sm mb-4">Insights sur les membres actifs, croissance et engagement du groupe.</p>
            <AnimatedChart />
          </motion.div>

          {/* Temps de Réponse */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary hover:scale-[1.02] transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
              <Zap className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Réponses Instantanées</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Temps de réponse réduit de 80%. Support client toujours disponible.
            </p>
            <div className="flex items-center gap-2 text-primary text-sm">
              <span className="font-mono font-bold">80%</span>
              <span className="text-muted-foreground">plus rapide</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
