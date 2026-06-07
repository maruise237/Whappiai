"use client"

import { motion } from "framer-motion"
import { ShieldCheck, MessageCircle, ListChecks, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslation } from "react-i18next"

const benefits = [
  {
    icon: ShieldCheck,
    title: "vp_benefit_1_title",
    description: "vp_benefit_1_desc"
  },
  {
    icon: MessageCircle,
    title: "vp_benefit_2_title",
    description: "vp_benefit_2_desc"
  },
  {
    icon: ListChecks,
    title: "vp_benefit_3_title",
    description: "vp_benefit_3_desc"
  },
  {
    icon: Zap,
    title: "vp_benefit_4_title",
    description: "vp_benefit_4_desc"
  }
]

export function ValueProposition() {
  const { t } = useTranslation('landing')
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-primary/5 blur-[110px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-primary/5 blur-[110px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight max-w-4xl mx-auto leading-tight">
            {t('vp_title')}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border border-border/80 p-8 rounded-xl hover:bg-accent/40 hover:border-primary/30 transition-all duration-300 group shadow-sm"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 mb-6 text-primary group-hover:scale-110 transition-transform duration-300 bg-primary/10 rounded-xl flex items-center justify-center">
                  <benefit.icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t(benefit.title)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(benefit.description)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-primary font-medium mb-8 text-lg">
            {t('vp_subtitle')}
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-md shadow-primary/20 transition-all duration-300"
          >
            <Link href="/register">
              {t('vp_cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
