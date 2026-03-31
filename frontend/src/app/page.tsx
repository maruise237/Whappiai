import { SmoothScroll } from "@/components/landing/smooth-scroll"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { LogoMarquee } from "@/components/landing/logo-marquee"
import { ValueProposition } from "@/components/landing/value-proposition"
import { Metadata } from "next"
import dynamic from 'next/dynamic'
import { AuthRedirect } from "@/components/auth/auth-redirect"

const MainFeatures = dynamic(() => import('@/components/landing/main-features').then(mod => mod.MainFeatures))
const Testimonials = dynamic(() => import('@/components/landing/testimonials').then(mod => mod.Testimonials))
const Pricing = dynamic(() => import('@/components/landing/pricing').then(mod => mod.Pricing))
const FAQ = dynamic(() => import('@/components/landing/faq').then(mod => mod.FAQ))
const FinalCTA = dynamic(() => import('@/components/landing/final-cta').then(mod => mod.FinalCTA))
const Footer = dynamic(() => import('@/components/landing/footer').then(mod => mod.Footer))

export const metadata: Metadata = {
  title: "Whappi | Automatisation WhatsApp & Modération IA",
  description: "Boostez l'engagement de votre communauté WhatsApp avec notre IA de support et nos outils de modération anti-spam. Essai gratuit.",
  openGraph: {
    title: "Whappi - L'IA pour vos groupes WhatsApp",
    description: "Automatisez votre support client et modérez vos communautés WhatsApp avec une IA intelligente.",
    type: "website",
    locale: "fr_FR",
    siteName: "Whappi",
  },
  keywords: ["WhatsApp API", "Chatbot WhatsApp", "Modération WhatsApp", "Support Client IA", "Automatisation WhatsApp"],
}

export default function Home() {
  return (
    <>
      <AuthRedirect />
      <SmoothScroll>
        <main className="min-h-screen bg-background">
          <Navbar />
          <Hero />
          <LogoMarquee />
          <ValueProposition />
          <MainFeatures />
          <Testimonials />
          <Pricing />
          <FAQ />
          <FinalCTA />
          <Footer />
        </main>
      </SmoothScroll>
    </>
  )
}
