"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence, useInView, Variants } from "framer-motion"
import { Star, Quote, ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// --- Data Generation (Simulating 50+ testimonials) ---
const ROLES = ["CEO", "CTO", "Marketing Director", "Community Manager", "Product Owner", "Developer", "Support Lead"]
const COMPANIES = ["TechFlow", "DataSystems", "CloudNine", "GrowthHacker", "DevCorp", "SoftSolutions", "EcoTech"]
const NAMES = ["Alexandre", "Sarah", "Thomas", "Julie", "Kevin", "Laura", "David", "Emma", "Lucas", "Sophie"]
const CONTENTS = [
  "Whappi a révolutionné notre gestion client. L'IA est bluffante de précision.",
  "Le gain de temps est phénoménal. On a divisé le temps de réponse par 3.",
  "Intégration super simple, en 5 minutes tout était opérationnel. Bravo à l'équipe.",
  "La modération automatique nous a sauvés d'une vague de spam massive.",
  "Le support est réactif et à l'écoute. Une vraie relation de confiance.",
  "Enfin une API WhatsApp qui ne coûte pas un bras et qui fonctionne vraiment.",
  "Les webhooks sont ultra rapides, parfait pour nos automatisations.",
  "J'adore l'interface, c'est propre, moderne et intuitif.",
  "La fonctionnalité multi-agents est un game changer pour notre équipe support.",
  "On a pu scaler notre acquisition sans recruter 10 personnes au support."
]

const generateTestimonials = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${NAMES[i % NAMES.length]} ${String.fromCharCode(65 + (i % 26))}.`,
    role: ROLES[i % ROLES.length],
    company: COMPANIES[i % COMPANIES.length],
    content: CONTENTS[i % CONTENTS.length],
    avatar: `/avatars/${(i % 5) + 1}.png`, // Placeholder path
    rating: 5
  }))
}

const TESTIMONIALS = generateTestimonials(15)

// --- Animation Variants Library ---
const ANIMATION_EFFECTS = [
  {
    name: "fadeUp",
    variants: {
      initial: { opacity: 0, y: 40, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -40, scale: 0.95 }
    }
  },
  {
    name: "slideRight",
    variants: {
      initial: { opacity: 0, x: 100, filter: "blur(10px)" },
      animate: { opacity: 1, x: 0, filter: "blur(0px)" },
      exit: { opacity: 0, x: -100, filter: "blur(10px)" }
    }
  },
  {
    name: "scaleRotate",
    variants: {
      initial: { opacity: 0, scale: 0.5, rotate: -5 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 1.5, filter: "blur(20px)" }
    }
  },
  {
    name: "blurReveal",
    variants: {
      initial: { opacity: 0, filter: "blur(20px)", scale: 1.1 },
      animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
      exit: { opacity: 0, filter: "blur(10px)", scale: 0.9 }
    }
  },
  {
    name: "elasticPop",
    variants: {
      initial: { opacity: 0, scale: 0, y: 100 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } },
      exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }
    }
  }
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentEffect, setCurrentEffect] = useState(ANIMATION_EFFECTS[0])
  const [progress, setProgress] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-10%" })
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  
  const DURATION = 8000 // 8 seconds per slide
  const PROGRESS_STEP = 100 // Update progress every 100ms

  // Randomize effect on change
  const randomizeEffect = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * ANIMATION_EFFECTS.length)
    setCurrentEffect(ANIMATION_EFFECTS[randomIndex])
  }, [])

  const handleNext = useCallback(() => {
    randomizeEffect()
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    setProgress(0)
  }, [randomizeEffect])

  const handlePrev = useCallback(() => {
    randomizeEffect()
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
    setProgress(0)
  }, [randomizeEffect])

  // Auto-play Logic
  useEffect(() => {
    if (isPaused || !isInView) return

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + (100 / (DURATION / PROGRESS_STEP))
      })
    }, PROGRESS_STEP)

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [isPaused, isInView, handleNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInView) return
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isInView, handleNext, handlePrev])

  const currentTestimonial = TESTIMONIALS[currentIndex]

  return (
    <section 
      ref={containerRef} 
      className="py-24 relative overflow-hidden bg-background"
      aria-label="Témoignages clients"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-multiply animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] mix-blend-multiply animate-pulse delay-1000" />
      </div>

      <div className="container px-4 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4 px-4 py-1">
              Trust & Love
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              La communauté <span className="text-primary">Whappi</span>
            </h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
              Rejoignez plus de 500 entreprises qui automatisent leur croissance avec notre technologie.
            </p>
          </motion.div>
        </div>

        {/* Carousel Area */}
        <div className="max-w-4xl mx-auto relative min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={currentEffect.variants}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="w-full"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl hover:shadow-primary/5 transition-shadow duration-500">
                {/* Quote Icon */}
                <div className="absolute -top-6 -left-6 md:-top-10 md:-left-10 bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg transform rotate-6">
                  <Quote size={32} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {/* Avatar Column */}
                  <div className="flex-shrink-0 text-center md:text-left space-y-4">
                    <div className="relative mx-auto md:mx-0 w-24 h-24 rounded-full p-1 bg-gradient-to-br from-primary to-purple-500">
                      <Avatar className="w-full h-full border-4 border-background">
                        <AvatarImage src={currentTestimonial.avatar} alt={currentTestimonial.name} />
                        <AvatarFallback className="text-xl font-bold bg-background text-foreground">
                          {currentTestimonial.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1.5 shadow-md border border-border">
                         <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                            ))}
                         </div>
                      </div>
                    </div>
                    
                    <div className="hidden md:block">
                      <h4 className="font-semibold text-lg">{currentTestimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{currentTestimonial.role}</p>
                      <p className="text-xs text-primary font-medium mt-1">{currentTestimonial.company}</p>
                    </div>
                  </div>

                  {/* Content Column */}
                  <div className="flex-grow text-center md:text-left space-y-6">
                    <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground/90 font-serif italic">
                      "{currentTestimonial.content}"
                    </p>
                    
                    {/* Mobile Only Author Info */}
                    <div className="md:hidden">
                      <h4 className="font-semibold text-lg">{currentTestimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{currentTestimonial.role}</p>
                      <p className="text-xs text-primary font-medium mt-1">{currentTestimonial.company}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full rounded-b-3xl overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 md:-left-12 -translate-x-1/2 hidden md:block z-20">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full bg-background/80 backdrop-blur border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-0 md:-right-12 translate-x-1/2 hidden md:block z-20">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full bg-background/80 backdrop-blur border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Controls & Indicators */}
        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {TESTIMONIALS.slice(0, 5).map((_, idx) => ( // Show only first 5 dots for cleaner UI
              <button
                key={idx}
                onClick={() => {
                  randomizeEffect()
                  setCurrentIndex(idx)
                  setProgress(0)
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === currentIndex % 5 
                    ? "w-8 bg-primary" 
                    : "w-2 bg-primary/20 hover:bg-primary/40"
                )}
                aria-label={`Aller au témoignage ${idx + 1}`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" /> Reprendre
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              )}
            </Button>
            
            <div className="h-4 w-[1px] bg-border" />
            
            <span className="text-sm text-muted-foreground font-mono">
              {String(currentIndex + 1).padStart(2, '0')} / {TESTIMONIALS.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
