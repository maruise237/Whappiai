"use client"

import Link from "next/link"
import { useUser } from "@clerk/clerk-react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, LifeBuoy, Mail, ShieldCheck } from "lucide-react"

export default function ContactPage() {
  const { user } = useUser()
  const isSignedIn = Boolean(user)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="px-4 pb-20 pt-32">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 px-4 py-1 text-primary">
            Support Whappi
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Un vrai canal <span className="text-primary">support</span>, pas un formulaire perdu
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Les demandes support produit, paiement et abonnement passent maintenant par un espace dedie relié a votre compte,
            consultable par l&apos;admin et suivi en conversation.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="container mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LifeBuoy className="h-5 w-5 text-primary" /> Support en espace client
              </CardTitle>
              <CardDescription>
                Le meilleur chemin pour signaler un bug, un souci de paiement ou demander de l&apos;aide sur votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info title="Relie au compte" description="Le message garde votre email, votre plan et vos references utiles." />
                <Info title="Admin seulement" description="Les echanges arrivent dans une zone dediee cote admin." />
                <Info title="Transactions visibles" description="Les statuts de paiement peuvent etre recoupes sans perdre le contexte." />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={isSignedIn ? "/dashboard/support" : "/login"} className="sm:flex-1">
                  <Button className="w-full">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    {isSignedIn ? "Ouvrir mon support" : "Se connecter pour contacter le support"}
                  </Button>
                </Link>
                <Link href={isSignedIn ? "/dashboard/billing" : "/pricing"} className="sm:flex-1">
                  <Button variant="outline" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Voir les forfaits
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Contact commercial
              </CardTitle>
              <CardDescription>
                Pour les partenariats, demandes enterprise ou sujets hors compte utilisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="font-semibold text-foreground">Email</p>
                <a href="mailto:contact@whappi.com" className="text-primary hover:underline">contact@whappi.com</a>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Bon usage
                </p>
                <p className="mt-2">
                  Les incidents produit et paiement doivent passer par l&apos;espace support pour etre traces et visibles par l&apos;admin.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Info({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4 text-left">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
