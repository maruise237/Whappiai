"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, CreditCard, Lock, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import GradientBlinds from "@/components/landing/GradientBlinds"

const features = [
  "hero_feature_1",
  "hero_feature_2",
  "hero_feature_3",
  "hero_feature_4",
]

const trustNotes = [
  {
    icon: MessageCircle,
    title: "hero_trust_1_title",
    text: "hero_trust_1_text",
  },
  {
    icon: Lock,
    title: "hero_trust_2_title",
    text: "hero_trust_2_text",
  },
  {
    icon: CreditCard,
    title: "hero_trust_3_title",
    text: "hero_trust_3_text",
  },
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
  const { t } = useTranslation('landing')
  return (
    <section className="relative min-h-[88vh] flex flex-col justify-center overflow-hidden pt-24 pb-10 lg:pt-28 lg:pb-12">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-80 dark:opacity-65">
        <GradientBlinds
          gradientColors={["#07130D", "#128C7E", "#25D366", "#D9FBE8"]}
          angle={12}
          noise={0.14}
          blindCount={14}
          blindMinWidth={72}
          spotlightRadius={0.46}
          spotlightSoftness={1.35}
          spotlightOpacity={0.55}
          mouseDampening={0.18}
          mirrorGradient
          distortAmount={0.08}
          shineDirection="left"
          mixBlendMode="screen"
          dpr={1.25}
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background)/0.62)_46%,hsl(var(--background))_82%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/88 via-background/72 to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background)/0.92)_0%,transparent_26%,transparent_74%,hsl(var(--background)/0.92)_100%)] pointer-events-none" />

      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-sm font-semibold text-primary dark:text-emerald-400">{t('hero_badge')}</span>
          </motion.div>

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
                {t('hero_title_1')}
              </motion.span>
            </span>
            <span className="block text-primary">{t('hero_title_2')}</span>
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                variants={textRevealVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                custom={2}
              >
                {t('hero_title_3')}
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            {t('hero_desc')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.3 }}
            className="hidden lg:flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{t(feature)}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 pt-2 justify-center"
          >
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105"
              asChild
            >
              <Link href="/register">
                {t('hero_cta_primary')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-14 text-base font-medium border-border hover:bg-muted/50 transition-all hover:scale-105"
              asChild
            >
              <Link href="#features">{t('hero_cta_secondary')}</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl pt-2"
          >
            {trustNotes.map((note) => (
              <div key={note.title} className="rounded-xl border border-border/70 bg-background/65 px-4 py-3 text-left shadow-[0_0_0_1px_rgba(0,0,0,0.02)] backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <note.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t(note.title)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(note.text)}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
