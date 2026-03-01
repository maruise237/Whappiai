"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, Layers, Puzzle } from "lucide-react";
import Link from "next/link";

const RESOURCE_ITEMS = [
  {
    title: "SDK JS / TS",
    desc: "Client Node.js & Browser.",
    cmd: "npm install whappi",
    color: "text-orange-600",
    bg: "bg-orange-100",
    icon: FileCode,
    href: "https://github.com/kamtech/whappi-js"
  },
  {
    title: "SDK Python",
    desc: "Django, Flask, FastAPI.",
    cmd: "pip install whappi",
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: FileCode,
    href: "https://github.com/kamtech/whappi-py"
  },
  {
    title: "SDK PHP",
    desc: "Laravel & Symfony.",
    cmd: "composer require whappi",
    color: "text-purple-600",
    bg: "bg-purple-100",
    icon: FileCode,
    href: "https://github.com/kamtech/whappi-php"
  },
  {
    title: "Postman",
    desc: "Collection d&apos;API complète.",
    cmd: "Télécharger JSON",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: Layers,
    href: "#"
  },
  {
    title: "Templates n8n",
    desc: "Workflows d&apos;automatisation.",
    cmd: "Voir les templates",
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    icon: Puzzle,
    href: "#"
  },
  {
    title: "Docker",
    desc: "Déploiement simplifié.",
    cmd: "Voir sur GitHub",
    color: "text-pink-600",
    bg: "bg-pink-100",
    icon: Puzzle,
    href: "https://github.com/kamtech/whappi"
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4 text-center max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-6">Bibliothèque</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Ressources & <span className="text-primary">Outils</span>
        </h1>
        <p className="text-xl text-muted-foreground">Accélérez votre développement.</p>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {RESOURCE_ITEMS.map((item, i) => (
              <Card key={i} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${item.bg} dark:bg-opacity-20 flex items-center justify-center mb-4`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button variant="outline" className="w-full text-xs" asChild>
                    <Link href={item.href} target="_blank">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      {item.cmd}
                    </Link>
                  </Button>
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
