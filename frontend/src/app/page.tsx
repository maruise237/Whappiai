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
  title: "Whappi | Bot d'admin pour groupes WhatsApp",
  description: "Automatisez l'accueil, l'anti-spam, les avertissements et les rappels dans vos groupes WhatsApp. Pensé pour les admins africains francophones.",
  openGraph: {
    title: "Whappi - Le co-admin de vos groupes WhatsApp",
    description: "Gardez vos groupes propres sans surveiller chaque message : bienvenue automatique, anti-liens, avertissements, ban auto et rappels.",
    type: "website",
    locale: "fr_FR",
    siteName: "Whappi",
  },
  keywords: ["Bot WhatsApp", "Modération WhatsApp", "Groupe WhatsApp", "Admin WhatsApp", "Anti spam WhatsApp", "WhatsApp Afrique"],
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
