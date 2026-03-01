"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Code, Heart, Laptop, Zap } from "lucide-react";

const VALUES = [
  { icon: Zap, title: "Innovation Rapide", desc: "Nous expédions du code tous les jours." },
  { icon: Laptop, title: "Remote First", desc: "Travaillez d&apos;où vous voulez." },
  { icon: Heart, title: "Bienveillance", desc: "Un environnement sain et respectueux." },
];

const JOBS = [
  { title: "Senior Fullstack Engineer", dept: "Engineering", loc: "Remote (Europe)", icon: Code },
  { title: "DevOps / SRE", dept: "Infrastructure", loc: "Remote (Monde)", icon: Code },
  { title: "Developer Advocate", dept: "Community", loc: "Remote (US/Europe)", icon: Heart },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4 text-center max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-6">On recrute !</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Rejoignez <span className="text-primary">l&apos;aventure</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Construisons la prochaine génération d&apos;outils de communication.
        </p>
        <Button size="lg" className="rounded-full">
          Voir les offres <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {VALUES.map((v, i) => (
              <Card key={i} className="bg-background">
                <CardHeader>
                  <v.icon className="w-10 h-10 text-primary mb-4" />
                  <CardTitle>{v.title}</CardTitle>
                  <CardDescription>{v.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <h2 className="text-3xl font-bold mb-8 text-center">Postes ouverts</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {JOBS.map((job, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors group cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><job.icon className="w-4 h-4" /> {job.dept}</span>
                      <span className="flex items-center gap-1"><Laptop className="w-4 h-4" /> {job.loc}</span>
                    </div>
                  </div>
                  <Button variant="ghost">Postuler</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
