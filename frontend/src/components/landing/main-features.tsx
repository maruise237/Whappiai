"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle, ShieldCheck, Ban, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ChatPreview } from "@/components/landing/chat-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const features = [
  {
    icon: MessageCircle,
    title: "mf_feature_1_title",
    description: "mf_feature_1_desc",
    href: "/features/welcome",
    details: [
      "mf_feature_1_detail_1",
      "mf_feature_1_detail_2",
      "mf_feature_1_detail_3",
      "mf_feature_1_detail_4"
    ],
    cta: "mf_feature_1_cta"
  },
  {
    icon: ShieldCheck,
    title: "mf_feature_2_title",
    description: "mf_feature_2_desc",
    href: "/features/moderation",
    details: [
      "mf_feature_2_detail_1",
      "mf_feature_2_detail_2",
      "mf_feature_2_detail_3",
      "mf_feature_2_detail_4"
    ],
    cta: "mf_feature_2_cta"
  },
  {
    icon: Ban,
    title: "mf_feature_3_title",
    description: "mf_feature_3_desc",
    href: "/features/warnings",
    details: [
      "mf_feature_3_detail_1",
      "mf_feature_3_detail_2",
      "mf_feature_3_detail_3",
      "mf_feature_3_detail_4"
    ],
    cta: "mf_feature_3_cta"
  },
  {
    icon: Calendar,
    title: "mf_feature_4_title",
    description: "mf_feature_4_desc",
    href: "/features/scheduled-messages",
    details: [
      "mf_feature_4_detail_1",
      "mf_feature_4_detail_2",
      "mf_feature_4_detail_3",
      "mf_feature_4_detail_4"
    ],
    cta: "mf_feature_4_cta"
  }
]

export function MainFeatures() {
  const { t } = useTranslation('landing')
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <section id="features" className="py-24 px-4 bg-background overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('mf_title')}
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Features List */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative group rounded-2xl p-6 transition-all duration-300 cursor-pointer border ${
                  activeFeature === index 
                    ? "bg-primary/5 border-primary/50 shadow-sm" 
                    : "bg-card/50 border-transparent hover:bg-card hover:border-border/50"
                }`}
                onClick={() => setActiveFeature(index)}
              >
                {/* Active Indicator Line */}
                {activeFeature === index && (
                  <motion.div
                    layoutId="activeFeatureLine"
                    className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="shrink-0 relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                      activeFeature === index ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                        activeFeature === index ? "text-primary" : "text-foreground"
                        }`}>
                        {t(feature.title)}
                        </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-3">
                      {t(feature.description)}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                            variant="link" 
                            className={`p-0 h-auto font-semibold group/btn ${activeFeature === index ? "text-primary" : "text-muted-foreground"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                        {t('mf_learn_more')} 
                            <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] border-border/50 bg-background/95 backdrop-blur-xl">
                        <DialogHeader>
                          <div className="flex items-center gap-4 mb-4">
                             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <feature.icon className="w-6 h-6" />
                             </div>
                             <DialogTitle className="text-2xl font-bold">{t(feature.title)}</DialogTitle>
                          </div>
                          <DialogDescription className="text-base leading-relaxed">
                            {t(feature.description)}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-3 py-4">
                           <h4 className="font-semibold text-foreground mb-2">{t('mf_dialog_what_you_can')}</h4>
                           {feature.details?.map((detail) => (
                             <div key={detail} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{t(detail)}</span>
                             </div>
                           ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-border/50">
                            <Button variant="outline" asChild className="rounded-full">
                                <Link href="/contact">{t('mf_talk_to_expert')}</Link>
                            </Button>
                            <Button asChild className="rounded-full">
                                <Link href="/register">{t(feature.cta)}</Link>
                            </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Phone Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="relative mx-auto lg:mr-0 lg:ml-auto w-full flex justify-center lg:justify-end"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-primary/10 rounded-full blur-[90px] -z-10" />
            
            <ChatPreview 
              onScenarioChange={setActiveFeature} 
              selectedIndex={activeFeature}
            />
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center mt-20"
        >
          <Button
            size="lg"
            className="rounded-full px-8 h-14 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105"
            asChild
          >
            <Link href="/register">
              {t('mf_cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
