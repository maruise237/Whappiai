"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslation } from "react-i18next"

export function FinalCTA() {
  const { t } = useTranslation('landing')
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section className="py-24 px-4">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight"
          style={{ fontFamily: "var(--font-cal-sans)" }}
        >
          {t('cta_title')}
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          {t('cta_desc')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="shimmer-btn bg-primary text-primary-foreground hover:bg-secondary rounded-full px-8 h-14 text-base font-medium shadow-md shadow-primary/20"
            asChild
          >
            <Link href="/register">
              {t('cta_primary')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-14 text-base font-medium border-border text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary bg-transparent"
            asChild
          >
            <a href="mailto:sales@whappi.com">{t('cta_secondary')}</a>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t('cta_note')}</p>
      </motion.div>
    </section>
  )
}
