"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowRight, MessageCircle, ShieldCheck, Zap, Users, Lock, CreditCard } from "lucide-react"

const faqData = [
  {
    question: "faq_q_1",
    answer: "faq_a_1",
    icon: ShieldCheck
  },
  {
    question: "faq_q_2",
    answer: "faq_a_2",
    icon: MessageCircle
  },
  {
    question: "faq_q_3",
    answer: "faq_a_3",
    icon: Zap
  },
  {
    question: "faq_q_4",
    answer: "faq_a_4",
    icon: Users
  },
  {
    question: "faq_q_5",
    answer: "faq_a_5",
    icon: Lock
  },
  {
    question: "faq_q_6",
    answer: "faq_a_6",
    icon: CreditCard
  }
]

export function FAQ() {
  const { t } = useTranslation('landing')
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [activeItem, setActiveItem] = useState<string | null>(null)

  return (
    <section ref={ref} className="py-24 relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-[110px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[110px]" />
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="px-4 py-1.5 text-sm border-primary/20 bg-primary/5 text-primary mb-4 rounded-full">
              {t('faq_badge')}
            </Badge>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            {t('faq_title')}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            {t('faq_subtitle')}
            <br className="hidden sm:block" />
            {t('faq_subtitle_2')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-4" onValueChange={(value) => setActiveItem(value)}>
            {faqData.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className={`border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
                  activeItem === `item-${index}` 
                    ? "border-primary/50 shadow-sm bg-card" 
                    : "hover:border-primary/20 hover:bg-card/80"
                }`}
              >
                <AccordionTrigger className="hover:no-underline py-6 text-left">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${
                      activeItem === `item-${index}` ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-lg font-medium transition-colors ${
                      activeItem === `item-${index}` ? "text-foreground" : "text-foreground/80"
                    }`}>
                      {t(item.question)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 pl-[3.25rem]">
                  {t(item.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-2 p-4 md:p-1 bg-muted/50 rounded-2xl md:rounded-full border border-border mx-auto">
            <div className="px-3 text-sm font-semibold text-primary">
              {t('faq_cta_badge')}
            </div>
            <span className="text-sm font-medium text-center md:text-left md:mr-4">{t('faq_cta_text')}</span>
            <Button size="sm" className="rounded-full w-full md:w-auto" asChild>
              <Link href="/contact">
                {t('faq_cta_button')} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
